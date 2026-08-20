# Exercise 006: Requirements Clarification

## Scenario

You are a developer on an e-commerce team. Your product manager, Jamie, has sent a message requesting a "notifications" feature for the order management system. The message is in `stakeholder-request.md`.

Read it before continuing.

## Goal

Use a coding agent to explore two workflows and compare the results:

1. **Implement directly** from the vague stakeholder request.
2. **Clarify first** — use the agent to surface ambiguities, produce a written specification, then implement from that spec.

By the end, you should be able to articulate what information was missing, how the agent handled ambiguity in each case, and why spec-first matters.

## Part 1: Implement from the Vague Request

Give the stakeholder request directly to your coding agent and ask it to implement the feature. You can either paste the content or reference the file.

Example prompt:

> Read `stakeholder-request.md`. This is a feature request from our product manager. Implement the notifications feature for our order management system.

**Do not provide additional clarification.** Let the agent work from the message as-is.

After the agent finishes, review the output and note:

- What channels did the agent support? (Email? SMS? Webhooks? Push?)
- What events trigger notifications?
- Did it create a preference system? How does it work?
- How does it handle delivery failures?
- Did it address the marketing/promotional mention?
- What assumptions did the agent make that Jamie never confirmed?
- Are there architectural decisions the agent made silently?

Save or screenshot the output for comparison.

## Part 2: Clarify Requirements First

Now reset (discard the implementation from Part 1) and take a different approach. Ask the agent to help you **clarify the requirements** rather than implement them.

Example prompt:

> Read `stakeholder-request.md`. This is a feature request from our product manager. Before implementing anything, I need to clarify the requirements. Analyze this request and:
>
> 1. List every ambiguity or missing detail you can identify.
> 2. For each ambiguity, suggest a clarifying question I should ask the PM.
> 3. Group the questions by topic (scope, channels, triggers, preferences, reliability, etc.)

Review the questions the agent generates. For each one, decide on a reasonable answer (play the role of the PM yourself, or discuss with a partner).

Then ask the agent to write a specification:

> Based on the original request and the following decisions, write a structured technical specification for the notifications feature:
>
> [Paste your answers to the clarifying questions]
>
> The spec should cover: scope, event triggers, channels, preference model, delivery guarantees, data model, API endpoints, and out-of-scope items.

## Part 3: Implement from the Spec

Take the specification produced in Part 2 and use it as the input for implementation:

> Implement the notifications feature according to this specification:
>
> [Reference or paste the spec]

## Part 4: Compare

With both implementations available (or your notes from each), compare:

| Dimension | Part 1 (Vague) | Part 3 (From Spec) |
|---|---|---|
| Scope — what was included? | | |
| Scope — what was excluded? | | |
| Assumptions the agent made silently | | |
| Edge cases addressed | | |
| Consistency with existing system | | |
| Completeness of the solution | | |
| Confidence you could ship this | | |

## Suggested Experiments

| Variation | What to try |
|---|---|
| Different agents | Run Part 1 with two different agents — do they make the same assumptions? |
| Iterative clarification | In Part 2, go back and forth with the agent 2-3 times refining the spec |
| Partial spec | Write a spec that covers channels but leaves preferences vague — see what happens |
| Contradictory answers | Give contradictory decisions (e.g., "support all channels" + "keep it simple") and see how the agent resolves the conflict |
| Spec review | After generating the spec, ask a second agent to review it for gaps |

## Reflection Questions

1. How many ambiguities did the agent find in Jamie's message? How many can you find that the agent missed?
2. In Part 1, did the agent acknowledge uncertainty or just pick an approach silently?
3. Would Jamie be satisfied with the Part 1 implementation? What would need to change?
4. How much time did the clarification step (Part 2) add? How much rework time would it save?
5. Is there a point where over-specifying becomes counterproductive? Where is that line?
6. How could you integrate this clarification workflow into your daily practice without it feeling heavyweight?

## Key Takeaway

Coding agents are confident generators — they will produce *something* from any prompt. The quality of the output depends heavily on the quality of the input. Using the agent to surface ambiguity and produce a written spec before implementation is a high-leverage practice that costs minutes and saves hours.

The workflow:

```
Vague request
      ↓
Agent identifies ambiguities
      ↓
Human makes decisions
      ↓
Agent writes specification
      ↓
Human reviews spec
      ↓
Agent implements from spec
      ↓
Human verifies
```

This is not waterfall — it is a 15-minute investment that turns a vague idea into an aligned, verifiable plan.



# Bonus / Alternative Prompts

## Grill Me
>Read stakeholder-request.md. This is a feature request from our product manager. Before implementing anything, I need to clarify the requirements. Analyze this request and use the /grill-with-docs skill to clarify the requirements.

## Straight to implmentation - (Use Spec mode)
>Read `stakeholder-request.md`. This is a feature request from our product manager. Implement the notifications feature for our order management system. Do not ask clarifing questions go straight into implmentation.


## Straight to implmentation - (Use Default mode)
>Read `stakeholder-request.md`. This is a feature request from our product manager. Implement the notifications feature for our order management system. Do not ask clarifing questions go straight into implmentation.