const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";

// Color palette - Ocean/AWS themed
const colors = {
  primary: "232F3E",    // AWS dark navy
  secondary: "1B659D",  // Blue
  accent: "FF9900",     // AWS orange
  light: "F5F8FC",      // Light blue-gray
  white: "FFFFFF",
  darkText: "1A1A2E",
  bodyText: "333333",
  muted: "666666",
};

// =================================================================
// SLIDE 1: Title Slide
// =================================================================
let slide1 = pres.addSlide();
slide1.background = { color: colors.primary };

slide1.addText("Inventory Management System", {
  x: 0.8, y: 1.5, w: 8.4, h: 1.2,
  fontSize: 40, fontFace: "Calibri", bold: true,
  color: colors.white, align: "left",
});

slide1.addText("Serverless REST API on AWS", {
  x: 0.8, y: 2.7, w: 8.4, h: 0.6,
  fontSize: 22, fontFace: "Calibri",
  color: colors.accent, align: "left",
});

slide1.addText("Python  |  Flask  |  AWS Lambda  |  DynamoDB  |  CDK", {
  x: 0.8, y: 3.6, w: 8.4, h: 0.5,
  fontSize: 14, fontFace: "Calibri",
  color: "AABBCC", align: "left",
});

slide1.addText("Project Overview", {
  x: 0.8, y: 4.6, w: 8.4, h: 0.4,
  fontSize: 12, fontFace: "Calibri", italic: true,
  color: "8899AA", align: "left",
});

// =================================================================
// SLIDE 2: Project Overview
// =================================================================
let slide2 = pres.addSlide();
slide2.background = { color: colors.white };

slide2.addText("Project Overview", {
  x: 0.8, y: 0.4, w: 8.4, h: 0.7,
  fontSize: 36, fontFace: "Calibri", bold: true,
  color: colors.primary, align: "left",
});

slide2.addText("A lightweight inventory management system for warehouse operations, tracking products, categories, and stock movements through a REST API.", {
  x: 0.8, y: 1.3, w: 8.4, h: 0.8,
  fontSize: 15, fontFace: "Calibri",
  color: colors.bodyText, align: "left",
});

// Feature cards - 2x2 grid
const features = [
  { title: "Product Management", desc: "CRUD operations for products\nwith SKU, pricing, categories" },
  { title: "Stock Tracking", desc: "Record movements: received,\nshipped, adjusted, returned" },
  { title: "Reorder Alerts", desc: "Automatic low-stock alerts\nwith suggested reorder quantities" },
  { title: "Reporting", desc: "Stock summaries, movement\nhistory, category reports" },
];

const cardW = 4.0;
const cardH = 1.5;
const startX = 0.8;
const startY = 2.3;
const gapX = 0.4;
const gapY = 0.3;

features.forEach((feat, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const x = startX + col * (cardW + gapX);
  const y = startY + row * (cardH + gapY);

  slide2.addShape(pres.ShapeType.roundRect, {
    x, y, w: cardW, h: cardH,
    fill: { color: colors.light },
    shadow: { type: "outer", blur: 4, offset: 2, angle: 135, color: "000000", opacity: 0.1 },
    rectRadius: 0.05,
  });

  slide2.addText(feat.title, {
    x: x + 0.3, y: y + 0.2, w: cardW - 0.6, h: 0.4,
    fontSize: 16, fontFace: "Calibri", bold: true,
    color: colors.secondary, align: "left", margin: 0,
  });

  slide2.addText(feat.desc, {
    x: x + 0.3, y: y + 0.6, w: cardW - 0.6, h: 0.7,
    fontSize: 13, fontFace: "Calibri",
    color: colors.bodyText, align: "left", margin: 0,
  });
});

// =================================================================
// SLIDE 3: Architecture Diagram
// =================================================================
let slide3 = pres.addSlide();
slide3.background = { color: colors.white };

slide3.addText("System Architecture", {
  x: 0.8, y: 0.3, w: 8.4, h: 0.7,
  fontSize: 36, fontFace: "Calibri", bold: true,
  color: colors.primary, align: "left",
});

// Add the architecture diagram image
const diagramPath = path.resolve(__dirname, "diagrams", "presentation-architecture.png");
const diagramData = fs.readFileSync(diagramPath).toString("base64");

slide3.addImage({
  data: "image/png;base64," + diagramData,
  x: 0.3, y: 1.1, w: 9.4, h: 4.4,
  sizing: { type: "contain", w: 9.4, h: 4.4 },
});

// =================================================================
// SLIDE 4: Technology Stack
// =================================================================
let slide4 = pres.addSlide();
slide4.background = { color: colors.white };

slide4.addText("Technology Stack", {
  x: 0.8, y: 0.4, w: 8.4, h: 0.7,
  fontSize: 36, fontFace: "Calibri", bold: true,
  color: colors.primary, align: "left",
});

// Left column - Application
slide4.addText("Application", {
  x: 0.8, y: 1.3, w: 4.0, h: 0.4,
  fontSize: 18, fontFace: "Calibri", bold: true,
  color: colors.secondary, align: "left",
});

const appStack = [
  { label: "Python 3.12", detail: "Runtime" },
  { label: "Flask", detail: "REST API framework" },
  { label: "Pydantic", detail: "Data validation & models" },
  { label: "Mangum", detail: "ASGI/WSGI to Lambda adapter" },
];

appStack.forEach((item, i) => {
  slide4.addText([
    { text: item.label, options: { bold: true, color: colors.darkText } },
    { text: "  " + item.detail, options: { color: colors.muted } },
  ], {
    x: 1.0, y: 1.8 + i * 0.5, w: 4.0, h: 0.45,
    fontSize: 14, fontFace: "Calibri", align: "left",
    bullet: true,
  });
});

// Right column - AWS Infrastructure
slide4.addText("AWS Infrastructure", {
  x: 5.2, y: 1.3, w: 4.0, h: 0.4,
  fontSize: 18, fontFace: "Calibri", bold: true,
  color: colors.secondary, align: "left",
});

const awsStack = [
  { label: "API Gateway", detail: "REST API with throttling" },
  { label: "Lambda", detail: "Serverless compute (256MB)" },
  { label: "DynamoDB", detail: "NoSQL tables (pay-per-request)" },
  { label: "CDK", detail: "Infrastructure as Code" },
];

awsStack.forEach((item, i) => {
  slide4.addText([
    { text: item.label, options: { bold: true, color: colors.darkText } },
    { text: "  " + item.detail, options: { color: colors.muted } },
  ], {
    x: 5.4, y: 1.8 + i * 0.5, w: 4.2, h: 0.45,
    fontSize: 14, fontFace: "Calibri", align: "left",
    bullet: true,
  });
});

// Data layer section
slide4.addText("Data Model", {
  x: 0.8, y: 4.1, w: 8.4, h: 0.4,
  fontSize: 18, fontFace: "Calibri", bold: true,
  color: colors.secondary, align: "left",
});

const tables = [
  { name: "Categories", key: "PK: id" },
  { name: "Products", key: "PK: sku, GSI: category-index" },
  { name: "Stock Movements", key: "PK: id, GSI: product-sku-index" },
];

tables.forEach((t, i) => {
  const x = 0.8 + i * 3.1;
  slide4.addShape(pres.ShapeType.roundRect, {
    x, y: 4.6, w: 2.8, h: 0.8,
    fill: { color: colors.light },
    rectRadius: 0.04,
  });
  slide4.addText(t.name, {
    x, y: 4.6, w: 2.8, h: 0.4,
    fontSize: 13, fontFace: "Calibri", bold: true,
    color: colors.primary, align: "center", margin: 0,
  });
  slide4.addText(t.key, {
    x, y: 5.0, w: 2.8, h: 0.35,
    fontSize: 11, fontFace: "Calibri",
    color: colors.muted, align: "center", margin: 0,
  });
});

// =================================================================
// SLIDE 5: API Endpoints
// =================================================================
let slide5 = pres.addSlide();
slide5.background = { color: colors.white };

slide5.addText("REST API Endpoints", {
  x: 0.8, y: 0.4, w: 8.4, h: 0.7,
  fontSize: 36, fontFace: "Calibri", bold: true,
  color: colors.primary, align: "left",
});

const endpoints = [
  { group: "Categories", methods: "GET /categories  |  POST /categories  |  DELETE /categories/{id}" },
  { group: "Products", methods: "GET /products  |  POST /products  |  DELETE /products/{sku}" },
  { group: "Stock", methods: "GET /stock/{sku}/level  |  POST /stock/movements  |  GET /stock/movements" },
  { group: "Alerts & Reports", methods: "GET /stock/alerts  |  GET /stock/summary" },
];

endpoints.forEach((ep, i) => {
  const y = 1.4 + i * 1.0;

  slide5.addText(ep.group, {
    x: 0.8, y, w: 8.4, h: 0.35,
    fontSize: 16, fontFace: "Calibri", bold: true,
    color: colors.secondary, align: "left",
  });

  slide5.addText(ep.methods, {
    x: 1.0, y: y + 0.35, w: 8.2, h: 0.4,
    fontSize: 12, fontFace: "Courier New",
    color: colors.bodyText, align: "left",
  });
});

// Note at bottom
slide5.addText("All endpoints return JSON  |  Input validation on all requests  |  Standard HTTP status codes", {
  x: 0.8, y: 5.0, w: 8.4, h: 0.3,
  fontSize: 11, fontFace: "Calibri", italic: true,
  color: colors.muted, align: "left",
});

// =================================================================
// SLIDE 6: Application Layers
// =================================================================
let slide6 = pres.addSlide();
slide6.background = { color: colors.white };

slide6.addText("Application Layers", {
  x: 0.8, y: 0.4, w: 8.4, h: 0.7,
  fontSize: 36, fontFace: "Calibri", bold: true,
  color: colors.primary, align: "left",
});

const layers = [
  { name: "API Layer", file: "src/app.py", desc: "Flask routes handling HTTP requests and responses", color: "4A90D9" },
  { name: "Service Layer", file: "src/services.py", desc: "Business logic, validation, stock calculations, reorder alerts", color: "5BA85A" },
  { name: "Model Layer", file: "src/models.py", desc: "Pydantic models: Category, Product, StockMovement, ReorderAlert", color: "E8A838" },
  { name: "Data Store", file: "src/store.py", desc: "In-memory storage (planned DynamoDB backend via CDK)", color: "9B59B6" },
];

layers.forEach((layer, i) => {
  const y = 1.3 + i * 1.05;

  // Color indicator
  slide6.addShape(pres.ShapeType.rect, {
    x: 0.8, y: y + 0.05, w: 0.12, h: 0.7,
    fill: { color: layer.color },
  });

  slide6.addText(layer.name, {
    x: 1.1, y, w: 4.0, h: 0.4,
    fontSize: 16, fontFace: "Calibri", bold: true,
    color: colors.darkText, align: "left", margin: 0,
  });

  slide6.addText(layer.file, {
    x: 5.0, y, w: 3.0, h: 0.35,
    fontSize: 12, fontFace: "Courier New",
    color: colors.muted, align: "left", margin: 0,
  });

  slide6.addText(layer.desc, {
    x: 1.1, y: y + 0.4, w: 7.8, h: 0.4,
    fontSize: 13, fontFace: "Calibri",
    color: colors.bodyText, align: "left", margin: 0,
  });
});

// =================================================================
// SLIDE 7: Deployment & Next Steps
// =================================================================
let slide7 = pres.addSlide();
slide7.background = { color: colors.primary };

slide7.addText("Deployment & Next Steps", {
  x: 0.8, y: 0.4, w: 8.4, h: 0.7,
  fontSize: 36, fontFace: "Calibri", bold: true,
  color: colors.white, align: "left",
});

// Current state
slide7.addText("Current State", {
  x: 0.8, y: 1.4, w: 4.2, h: 0.4,
  fontSize: 18, fontFace: "Calibri", bold: true,
  color: colors.accent, align: "left",
});

const currentItems = [
  "Fully functional REST API",
  "In-memory data store with sample data",
  "CDK stack defined and ready to deploy",
  "Comprehensive input validation",
];

currentItems.forEach((item, i) => {
  slide7.addText(item, {
    x: 1.0, y: 1.9 + i * 0.45, w: 4.0, h: 0.4,
    fontSize: 14, fontFace: "Calibri",
    color: "CADCFC", align: "left",
    bullet: true,
  });
});

// Next steps
slide7.addText("Next Steps", {
  x: 5.4, y: 1.4, w: 4.2, h: 0.4,
  fontSize: 18, fontFace: "Calibri", bold: true,
  color: colors.accent, align: "left",
});

const nextItems = [
  "Connect DynamoDB backend",
  "Add authentication (Cognito)",
  "Implement date-range filtering",
  "Add automated testing suite",
  "CI/CD pipeline setup",
];

nextItems.forEach((item, i) => {
  slide7.addText(item, {
    x: 5.6, y: 1.9 + i * 0.45, w: 4.0, h: 0.4,
    fontSize: 14, fontFace: "Calibri",
    color: "CADCFC", align: "left",
    bullet: true,
  });
});

// Deploy command
slide7.addText("Deploy with:", {
  x: 0.8, y: 4.4, w: 2.0, h: 0.4,
  fontSize: 13, fontFace: "Calibri",
  color: "8899AA", align: "left",
});

slide7.addShape(pres.ShapeType.roundRect, {
  x: 0.8, y: 4.8, w: 4.5, h: 0.5,
  fill: { color: "1A2332" },
  rectRadius: 0.03,
});

slide7.addText("cd cdk && cdk deploy", {
  x: 1.0, y: 4.8, w: 4.3, h: 0.5,
  fontSize: 14, fontFace: "Courier New",
  color: "00FF88", align: "left", margin: 0,
});

// =================================================================
// Write the file
// =================================================================
const outputPath = path.resolve(__dirname, "Inventory_Management_System.pptx");
pres.writeFile({ fileName: outputPath })
  .then(() => {
    console.log("Presentation created: " + outputPath);
  })
  .catch((err) => {
    console.error("Error creating presentation:", err);
    process.exit(1);
  });
