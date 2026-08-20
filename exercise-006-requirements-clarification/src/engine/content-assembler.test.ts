import { describe, it, expect } from 'vitest';
import { DefaultContentAssembler } from './content-assembler.js';
import {
  OrderEventType,
  OrderPlacedPayload,
  OrderShippedPayload,
  DeliveryEstimatePayload,
  OrderDeliveredPayload,
  OrderCancelledPayload,
} from '../types/index.js';

describe('DefaultContentAssembler', () => {
  const assembler = new DefaultContentAssembler();

  describe('ORDER_PLACED', () => {
    const payload: OrderPlacedPayload = {
      orderId: 'ORD-001',
      orderTotal: 59.97,
      items: [
        { itemName: 'Widget A', quantity: 2, unitPrice: 19.99 },
        { itemName: 'Widget B', quantity: 1, unitPrice: 19.99 },
      ],
    };

    it('should produce a subject with order ID', () => {
      const result = assembler.assemble(OrderEventType.ORDER_PLACED, payload);
      expect(result.subject).toBe('Order Confirmation - #ORD-001');
    });

    it('should include order total in the body', () => {
      const result = assembler.assemble(OrderEventType.ORDER_PLACED, payload);
      expect(result.body).toContain('$59.97');
    });

    it('should include all items in the body', () => {
      const result = assembler.assemble(OrderEventType.ORDER_PLACED, payload);
      expect(result.body).toContain('Widget A');
      expect(result.body).toContain('x2');
      expect(result.body).toContain('$19.99');
      expect(result.body).toContain('Widget B');
      expect(result.body).toContain('x1');
    });

    it('should include orderId, orderTotal, and items in metadata', () => {
      const result = assembler.assemble(OrderEventType.ORDER_PLACED, payload);
      expect(result.metadata.orderId).toBe('ORD-001');
      expect(result.metadata.orderTotal).toBe(59.97);
      expect(result.metadata.items).toEqual(payload.items);
    });
  });

  describe('ORDER_SHIPPED', () => {
    it('should include carrier and tracking when available', () => {
      const payload: OrderShippedPayload = {
        orderId: 'ORD-002',
        carrierName: 'FedEx',
        trackingNumber: 'TRACK123',
      };
      const result = assembler.assemble(OrderEventType.ORDER_SHIPPED, payload);

      expect(result.subject).toBe('Order Shipped - #ORD-002');
      expect(result.body).toContain('FedEx');
      expect(result.body).toContain('TRACK123');
      expect(result.metadata.orderId).toBe('ORD-002');
      expect(result.metadata.carrierName).toBe('FedEx');
      expect(result.metadata.trackingNumber).toBe('TRACK123');
    });

    it('should handle null carrier and tracking gracefully', () => {
      const payload: OrderShippedPayload = {
        orderId: 'ORD-003',
        carrierName: null,
        trackingNumber: null,
      };
      const result = assembler.assemble(OrderEventType.ORDER_SHIPPED, payload);

      expect(result.subject).toBe('Order Shipped - #ORD-003');
      expect(result.body).toContain('ORD-003');
      expect(result.body).not.toContain('Carrier:');
      expect(result.body).not.toContain('Tracking Number:');
      expect(result.metadata.orderId).toBe('ORD-003');
      expect(result.metadata.carrierName).toBeNull();
      expect(result.metadata.trackingNumber).toBeNull();
    });
  });

  describe('DELIVERY_ESTIMATE_UPDATED', () => {
    it('should include carrier, tracking, and estimated delivery date', () => {
      const estimatedDate = new Date('2024-12-25T10:00:00Z');
      const payload: DeliveryEstimatePayload = {
        orderId: 'ORD-004',
        carrierName: 'UPS',
        trackingNumber: 'UPS456',
        estimatedDeliveryDate: estimatedDate,
      };
      const result = assembler.assemble(OrderEventType.DELIVERY_ESTIMATE_UPDATED, payload);

      expect(result.subject).toBe('Delivery Estimate Updated - #ORD-004');
      expect(result.body).toContain('UPS');
      expect(result.body).toContain('UPS456');
      expect(result.body).toContain('2024-12-25');
      expect(result.metadata.orderId).toBe('ORD-004');
      expect(result.metadata.carrierName).toBe('UPS');
      expect(result.metadata.trackingNumber).toBe('UPS456');
      expect(result.metadata.estimatedDeliveryDate).toBe(estimatedDate);
    });
  });

  describe('ORDER_DELIVERED', () => {
    it('should include delivery timestamp', () => {
      const deliveryTime = new Date('2024-12-20T14:30:00Z');
      const payload: OrderDeliveredPayload = {
        orderId: 'ORD-005',
        deliveryTimestamp: deliveryTime,
      };
      const result = assembler.assemble(OrderEventType.ORDER_DELIVERED, payload);

      expect(result.subject).toBe('Order Delivered - #ORD-005');
      expect(result.body).toContain('2024-12-20');
      expect(result.metadata.orderId).toBe('ORD-005');
      expect(result.metadata.deliveryTimestamp).toBe(deliveryTime);
    });
  });

  describe('ORDER_CANCELLED', () => {
    it('should include cancellation reason and refund when applicable', () => {
      const payload: OrderCancelledPayload = {
        orderId: 'ORD-006',
        cancellationReason: 'Customer requested',
        refundAmount: 49.99,
        estimatedRefundProcessingTime: '3-5 business days',
      };
      const result = assembler.assemble(OrderEventType.ORDER_CANCELLED, payload);

      expect(result.subject).toBe('Order Cancelled - #ORD-006');
      expect(result.body).toContain('Customer requested');
      expect(result.body).toContain('$49.99');
      expect(result.body).toContain('3-5 business days');
      expect(result.metadata.orderId).toBe('ORD-006');
      expect(result.metadata.cancellationReason).toBe('Customer requested');
      expect(result.metadata.refundAmount).toBe(49.99);
      expect(result.metadata.estimatedRefundProcessingTime).toBe('3-5 business days');
    });

    it('should handle cancellation without refund', () => {
      const payload: OrderCancelledPayload = {
        orderId: 'ORD-007',
        cancellationReason: 'Out of stock',
        refundAmount: null,
        estimatedRefundProcessingTime: null,
      };
      const result = assembler.assemble(OrderEventType.ORDER_CANCELLED, payload);

      expect(result.subject).toBe('Order Cancelled - #ORD-007');
      expect(result.body).toContain('Out of stock');
      expect(result.body).not.toContain('Refund Amount');
      expect(result.body).not.toContain('Estimated Refund Processing Time');
      expect(result.metadata.orderId).toBe('ORD-007');
      expect(result.metadata.cancellationReason).toBe('Out of stock');
      expect(result.metadata.refundAmount).toBeNull();
      expect(result.metadata.estimatedRefundProcessingTime).toBeNull();
    });
  });
});
