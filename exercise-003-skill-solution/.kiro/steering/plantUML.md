---
inclusion: always
name: plantuml-diagrams
description: Create, modify, render, or troubleshoot PlantUML diagrams. Use whenever the user asks to create a diagram, architecture diagram, UML diagram, PlantUML file, sequence diagram, component diagram, deployment diagram, class diagram, ER diagram, or other visual representation that can be produced with PlantUML.
---

# PlantUML Diagram Generation

When the user asks to create, modify, render, or troubleshoot a diagram, use PlantUML and follow these requirements.

## Required PlantUML Skill

Use the PlantUML agent skill from:

https://github.com/SpillwaveSolutions/plantuml

The expected skill is named:

`plantuml`

Before beginning diagram generation:

1. Check whether the `plantuml` skill is available to the current agent.
2. If the skill is available, activate and follow it.
3. Use the skill's references, scripts, validation workflow, rendering workflow, and troubleshooting guidance as appropriate.
4. Do not silently replace the skill with your own implementation when the skill should be available.

If the `plantuml` skill is not installed or cannot be accessed:

- Tell the user that the required PlantUML skill is not available.
- Provide the source repository: `https://github.com/SpillwaveSolutions/plantuml`
- Explain that the skill should be installed/imported into Kiro before relying on this workflow.
- Do not claim that the skill was used when it was not available.

## Diagram Creation Workflow

Whenever the user requests a diagram or PlantUML:

1. Understand the diagram's purpose and the information that needs to be communicated.
2. Select the most appropriate PlantUML diagram type.
3. Inspect relevant source code, configuration, infrastructure definitions, documentation, or other workspace files when the requested diagram depends on them.
4. Use the `plantuml` skill and its appropriate reference material.
5. Generate a `.puml` source file.
6. Render the `.puml` file to an image.
7. Validate that rendering succeeded.
8. Inspect and correct rendering or syntax errors.
9. Repeat generation and rendering until a valid diagram is produced.
10. Return both the editable PlantUML source and the rendered diagram to the user.

A diagram request is not complete until both artifacts exist:

- PlantUML source: `.puml`
- Rendered diagram: preferably `.png` or `.svg`

Unless the user specifies otherwise, prefer SVG when the diagram will be used in documentation and PNG when broad image compatibility is more useful.

## File Organization

Unless the existing project has a diagram convention that should be followed, store generated diagrams under:

```text
diagrams/
```

Use descriptive filenames.

Examples:

```text
diagrams/system-architecture.puml
diagrams/system-architecture.svg

diagrams/authentication-sequence.puml
diagrams/authentication-sequence.svg
```

Keep the source and rendered image basename identical.

## Rendering and Validation

Never assume a `.puml` file is correct merely because the syntax looks valid.

Always render the diagram.

Use the PlantUML skill's provided rendering and validation tools whenever available.

If rendering fails:

1. Read the complete PlantUML error.
2. Identify the failing include, directive, element, alias, macro, or syntax.
3. Consult the PlantUML skill troubleshooting references.
4. Modify the `.puml` source.
5. Render again.
6. Continue iterating until rendering succeeds.

Do not stop at the first rendering error.

Do not present an unrendered PlantUML file as a successfully completed diagram.

If an external dependency or environment problem prevents successful rendering after reasonable troubleshooting, clearly tell the user what dependency is preventing completion and provide the relevant error.

## Diagram Quality

Prefer diagrams that communicate architecture clearly rather than diagrams that simply contain every available detail.

Use:

- Clear component names
- Consistent terminology
- Meaningful relationships
- Directional arrows when direction matters
- Logical grouping and boundaries
- Short relationship labels
- Notes only when they add important context
- Appropriate diagram types for the requested information

Avoid:

- Excessive crossing lines
- Huge diagrams with unreadable text
- Unnecessary implementation details
- Generic component names when specific names are known
- Inventing architecture that cannot be determined from the available information

When deriving a diagram from source code or infrastructure, distinguish between:

- Architecture explicitly represented by the source
- Reasonable structural inference
- Unknown or unavailable information

Do not fabricate missing components.

# AWS Architecture Diagrams

When the requested architecture contains AWS services, use the official AWS Icons for PlantUML project:

https://github.com/awslabs/aws-icons-for-plantuml

AWS architecture diagrams should use AWS service icons instead of generic rectangles whenever an appropriate AWS icon exists.

## AWS Icon Includes

Use the AWS Icons for PlantUML distribution.

Prefer a pinned release instead of the `main` branch so diagrams remain reproducible.

Use:

```plantuml
!define AWSPuml https://raw.githubusercontent.com/awslabs/aws-icons-for-plantuml/v23.0/dist
!include AWSPuml/AWSCommon.puml
```

Then include the required service definitions.

Example:

```plantuml
!include AWSPuml/Compute/Lambda.puml
!include AWSPuml/Storage/SimpleStorageService.puml
!include AWSPuml/Database/DynamoDB.puml
```

Prefer individual service includes when only a few services are required.

Category-level includes may be used when many icons from the same category are needed.

Do not use arbitrary or guessed AWS service macro names. Confirm the appropriate symbol name from the AWS Icons for PlantUML distribution when necessary.

**Important:** AWS service icon category paths do not always match intuitive naming. When unsure of the correct category for a service, consult the [AWSSymbols.md](https://github.com/awslabs/aws-icons-for-plantuml/blob/main/AWSSymbols.md) reference to find the correct include path.

Common services with non-obvious category paths:

| Service | Correct Include Path |
|---------|---------------------|
| API Gateway | `NetworkingContentDelivery/APIGateway.puml` |
| CloudFront | `NetworkingContentDelivery/CloudFront.puml` |
| ECS | `Containers/ElasticContainerService.puml` |
| EKS | `Containers/ElasticKubernetesService.puml` |
| SQS | `ApplicationIntegration/SimpleQueueService.puml` |
| SNS | `ApplicationIntegration/SimpleNotificationService.puml` |
| Step Functions | `ApplicationIntegration/StepFunctions.puml` |
| EventBridge | `ApplicationIntegration/EventBridge.puml` |

## AWS Example

A simple AWS architecture might resemble:

```plantuml
@startuml

!define AWSPuml https://raw.githubusercontent.com/awslabs/aws-icons-for-plantuml/v23.0/dist

!include AWSPuml/AWSCommon.puml
!include AWSPuml/Compute/Lambda.puml
!include AWSPuml/Storage/SimpleStorageService.puml
!include AWSPuml/Database/DynamoDB.puml

left to right direction

SimpleStorageService(s3, "Uploads", "S3 Bucket")
Lambda(processor, "Processor", "Lambda")
DynamoDB(table, "Metadata", "DynamoDB")

s3 --> processor : Object created
processor --> table : Store metadata

@enduml
```

This example is illustrative. Choose services, relationships, aliases, and layout based on the actual architecture requested by the user.

## AWS Architecture Conventions

When appropriate, visually represent architectural boundaries such as:

- AWS Account
- AWS Region
- Availability Zone
- VPC
- Public subnet
- Private subnet
- Application tier
- Data tier

Only add boundaries supported by the architecture being described.

For architecture based on IaC such as AWS CDK, CloudFormation, Terraform, or SAM, inspect the infrastructure definitions and use the deployed relationships represented there rather than guessing from filenames.

Use official AWS service names in labels where practical.

Examples:

- Amazon S3
- AWS Lambda
- Amazon DynamoDB
- Amazon ECS
- Amazon EC2
- Amazon API Gateway
- Amazon CloudFront
- Amazon SQS
- Amazon SNS
- Amazon Bedrock

The icon macro itself may use a shortened name required by the AWS PlantUML library.

# Existing Diagrams

When modifying an existing PlantUML diagram:

1. Preserve its existing style and organization unless the user asks for redesign.
2. Modify the `.puml` source rather than editing only the rendered image.
3. Re-render the diagram after every meaningful modification.
4. Ensure the rendered artifact corresponds to the latest `.puml` source.

# Completion Requirements

Before telling the user the diagram is complete, verify:

- The PlantUML skill was used if available.
- The `.puml` source file exists.
- The diagram renders successfully.
- The rendered image exists.
- The image corresponds to the current `.puml` source.
- AWS diagrams use AWS Icons for PlantUML where appropriate.
- AWS icon includes resolve successfully.
- No PlantUML syntax or rendering errors remain.

When reporting completion, give the user the paths to both the source and rendered diagram.
