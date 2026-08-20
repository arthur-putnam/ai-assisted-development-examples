# Exercise 007 — Debugging with Terminal Context

## Scenario

You've inherited a **Transaction Reconciliation Service** from a colleague who just left the company. The service processes financial transactions through a multi-stage pipeline and generates summary reports. It was working last week, but after a recent refactoring it now crashes every time it runs against production data.

Your colleague left in a hurry and didn't document what changed. The test suite passes, the code looks reasonable, and the error message is confusing.

You need to find and fix the bug.

## Goal

Use a coding agent with terminal access to collaboratively debug the crash. Practice the workflow of:

1. Reproducing the error
2. Sharing terminal output with the agent
3. Letting the agent investigate and form hypotheses
4. Testing hypotheses by running commands
5. Identifying the root cause
6. Applying and verifying the fix

## Starting State

- A complete Python application that crashes at runtime
- 25 passing unit tests
- A confusing error message that doesn't point to the actual bug
- No obvious code smells or syntax errors

## Setup

```bash
cd exercise-007-debugging-with-terminal
pip install -r requirements.txt
```

## Student Task

### Part 1: Reproduce the Crash

Run the application and observe the error:

```bash
python main.py
```

Note the error message and traceback. Where does it point? Does that location look like it contains a bug?

### Part 2: Gather Initial Evidence

Run the following and observe the differences:

```bash
# Does the test suite catch the issue?
python -m pytest tests/ -v

# What happens with different batch sizes?
python main.py --batch-size 105
python main.py --batch-size 20
python main.py --batch-size 10

# What does verbose mode reveal?
python main.py --verbose --batch-size 20
```

What pattern do you notice in the batch counts across different configurations?

### Part 3: Engage the Agent

Open a terminal in your IDE. Use `/terminal` (or paste the error output directly) to share the crash with your coding agent. Try a prompt like:

> I'm running `python main.py` and getting this error. The test suite passes (25/25). Can you help me debug it?

Observe how the agent approaches the problem:
- Does it go straight to the traceback location?
- Does it ask to run the program itself?
- Does it look at the batch counts pattern?
- How many files does it need to read before finding the root cause?

### Part 4: Evaluate the Agent's Investigation

As the agent investigates, pay attention to:

- **Hypothesis formation**: Does it identify the accumulation pattern in `[50, 100, 105]`?
- **Relevant questions**: Does it ask about shared state or object lifecycle?
- **Efficiency**: How quickly does it narrow from the symptom to the cause?
- **Red herrings**: Does it get distracted by the threading, the `__del__` method, or the pipeline stages?

### Part 5: Verify the Fix

Once the agent proposes a fix:

1. Apply it
2. Run `python main.py` — does it complete successfully?
3. Run `python main.py --batch-size 20` — still works?
4. Run `python -m pytest tests/ -v` — tests still pass?
5. Does the fix make sense? Is it the minimal correct change?

## Constraints

- Do not read the `.exercise/instructor/` directory until you've completed the exercise
- Let the agent drive the investigation — resist the urge to point it at the bug
- If the agent gets stuck, try providing additional evidence (run more commands, change batch sizes) rather than telling it where to look

## What to Observe

| Aspect | Watch for |
|--------|-----------|
| Traceback analysis | Does the agent recognize the traceback is misleading? |
| Pattern recognition | Does it notice the accumulating batch counts? |
| Hypothesis testing | Does it suggest running the program with different parameters? |
| Code reading strategy | Does it read files in a logical order? |
| Root cause identification | Does it find the actual bug, or just the symptom? |
| Fix quality | Is the proposed fix minimal and correct? |
| Explanation | Can it explain WHY the bug causes this specific behavior? |

## Reflection Questions

1. How long did the agent take to find the root cause? Did it need hints?
2. Did the agent get distracted by any red herrings (threading, `__del__`, pipeline complexity)?
3. Would the error message alone have been enough for the agent to find the bug, or did it need to read the code?
4. How would you rate the agent's debugging strategy — methodical or scattershot?
5. Could this bug have been caught by better tests? What test would have caught it?
6. Why do you think the existing tests pass despite the bug being present?

## Tips

- If the agent immediately jumps to a conclusion without evidence, ask it to verify its hypothesis by running the program
- Try asking the agent to explain the pattern `[50, 100, 105]` before it reads the code — can it hypothesize from the numbers alone?
- After fixing, ask the agent to write a test that would have caught this bug
