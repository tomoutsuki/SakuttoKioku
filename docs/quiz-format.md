# Sakutto Kioku Quiz JSON Format

This document defines the version 1 quiz format used by **サクッと記憶 (Sakutto Kioku)**.

The format is intentionally designed to be:

- deterministic
- easy for LLMs to generate
- easy for applications to validate
- human readable
- machine readable

Version 1 supports two question types:

- `multiple_choice`
- `drag_and_drop`

## 1. Top-Level Structure

Each quiz file must contain exactly one JSON object.

```json
{
  "id": "physics-basics-v1",
  "version": 1,
  "title": "Physics Basics",
  "description": "Mixed physics practice",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "What is Newton's Second Law?",
      "image": "assets/newton.png",
      "choices": [
        "F = ma",
        "E = mc^2",
        "PV = nRT",
        "a^2 + b^2 = c^2"
      ],
      "answer": 0,
      "explanation": "Force equals mass times acceleration.",
      "hint": "Think about the relationship between force, mass, and acceleration."
    },
    {
      "id": "q2",
      "type": "drag_and_drop",
      "question": "Match each quantity to its standard formula.",
      "pairs": [
        {
          "left": "Momentum",
          "right": "p = mv"
        },
        {
          "left": "Kinetic energy",
          "right": "E_k = 1/2 mv^2"
        },
        {
          "left": "Force",
          "right": "F = ma"
        }
      ],
      "explanation": "Each pair defines one correct match.",
      "hint": "Look for the formula attached to each physical quantity."
    }
  ]
}
```

## 2. Root Properties

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | No, but strongly recommended | Stable quiz identifier. If omitted, the app derives an identifier from quiz content. |
| `version` | `integer` | Yes | Quiz format version. Must be `1`. |
| `title` | `string` | Yes | User-facing quiz title. |
| `description` | `string` | No | Optional summary shown in the app. |
| `questions` | `array` | Yes | Non-empty array of quiz questions. |

### Root validation rules

- The JSON root must be an object, not an array.
- `version` must be the integer `1`.
- `title` must be a non-empty string.
- `questions` must contain at least one question.
- If `id` is present, it should be unique across imported quizzes.
- Unknown extra fields should be avoided for deterministic generation.

## 3. Question Types Overview

Every item in `questions` must have one of these `type` values:

| `type` | Purpose |
| --- | --- |
| `multiple_choice` | One prompt with exactly four choices and one correct answer index. |
| `drag_and_drop` | One prompt with a set of left/right pairs that define the correct matches. |

Common fields shared by all question types:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Unique identifier within the quiz. |
| `type` | `string` | Yes | Supported values are `"multiple_choice"` and `"drag_and_drop"`. |
| `question` | `string` | Yes | The prompt shown to the learner. |
| `image` | `string` | No | Relative path to an asset in ZIP imports, or a `data:` URL for standalone JSON. |
| `explanation` | `string` | No | Explanation shown after the learner answers. |
| `hint` | `string` | No | Optional hint that the learner can reveal before answering. |

### Common validation rules

- `id` must be unique within the quiz.
- `question` must be a non-empty string.
- `image`, when present, must be a non-empty string.
- `explanation`, when present, must be a string.
- `hint`, when present, must be a string.

## 4. `multiple_choice` Question Specification

A `multiple_choice` question presents four fixed options.

### Properties

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `choices` | `array<string>` | Yes | Exactly four answer choices. |
| `answer` | `integer` | Yes | Zero-based index of the correct choice. Must be `0`, `1`, `2`, or `3`. |

### Validation rules

- `type` must be exactly `"multiple_choice"`.
- `choices` must contain exactly four non-empty strings.
- `answer` must match one of the four choice indexes.

### Example

```json
{
  "id": "mc-1",
  "type": "multiple_choice",
  "question": "Which SI unit measures electric current?",
  "choices": ["Volt", "Ampere", "Newton", "Joule"],
  "answer": 1,
  "hint": "It is named after Andre-Marie Ampere."
}
```

## 5. `drag_and_drop` Question Specification

A `drag_and_drop` question defines a correct mapping between left-side items and right-side items.

### Properties

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `pairs` | `array<object>` | Yes | Array of correct left/right matches. Each object must contain `left` and `right`. |
| `pairs[].left` | `string` | Yes | The draggable item shown in the left column. |
| `pairs[].right` | `string` | Yes | The target item shown in the right column. |

### Validation rules

- `type` must be exactly `"drag_and_drop"`.
- `pairs` must contain at least two entries.
- Every `pairs[]` entry must be an object.
- Every `pairs[].left` must be a non-empty string.
- Every `pairs[].right` must be a non-empty string.
- `pairs[].left` values must be unique within the question.
- `pairs[].right` values must be unique within the question.

### Behavioral meaning

Each object inside `pairs` defines one correct match:

```json
{
  "left": "Momentum",
  "right": "p = mv"
}
```

This means the learner must match `Momentum` with `p = mv`.

### Determinism note

For LLM generation, the `pairs` array order should be stable. The application may render the right column in a different order for gameplay, but the JSON source should preserve a deterministic pair order.

### Example

```json
{
  "id": "dd-1",
  "type": "drag_and_drop",
  "question": "Match each optical element to its effect.",
  "pairs": [
    {
      "left": "Convex lens",
      "right": "Converges rays"
    },
    {
      "left": "Concave lens",
      "right": "Diverges rays"
    },
    {
      "left": "Plane mirror",
      "right": "Reflects without focusing"
    }
  ],
  "hint": "Think about whether the element brings rays together, spreads them apart, or only reflects them.",
  "explanation": "Lenses change convergence, while a plane mirror reflects without focusing."
}
```

## 6. JSON Import Rules

Standalone JSON import is intended for text-only quizzes or quizzes that embed image data directly.

Allowed:

- quizzes with no `image` field
- quizzes where `image` is a `data:` URL

Rejected:

- quizzes where `image` points to a local file such as `assets/cat.png`

Reason:

- a plain JSON file cannot carry external image files with it
- for local image assets, use a ZIP package instead

## 7. ZIP Package Rules

A ZIP archive may contain one or more quiz packages.

### Single-quiz package

```text
MyQuiz.zip
  quiz.json
  assets/
    image1.png
    image2.jpg
```

### Multi-quiz package

```text
CoursePack.zip
  physics/
    quiz.json
    assets/
      newton.png
  chemistry/
    quiz.json
    assets/
      atom.jpg
```

### ZIP validation rules

- At least one `quiz.json` file must exist in the archive.
- Each `quiz.json` is treated as one quiz package.
- Image references are resolved relative to the folder containing that `quiz.json`.
- If a question references `assets/example.png`, that file must exist in the package.
- Corrupted ZIP archives or unreadable files must be rejected.

## 8. Required Behavioral Rules

Applications implementing this format should enforce:

- one confirmed answer per question
- no answer changes after confirmation
- immediate correctness feedback
- correct answer highlighting
- wrong answer highlighting
- explanation display after answering
- optional hint display when the question provides one
- per-attempt time measurement for the completed quiz
- review access to incorrect questions from the latest attempt

For `drag_and_drop` questions specifically:

- learners may rearrange tentative matches before confirmation
- confirmation should require a complete set of matches
- once confirmed, the matches must lock like any other answer

## 9. Best Practices For LLM-Generated Quizzes

Use these recommendations when generating quizzes with an LLM:

- Always include the root `id`.
- Keep `id` values stable across regenerations of the same quiz.
- Use short, deterministic question ids such as `q1`, `q2`, `q3`.
- Do not emit extra fields unless the target app version explicitly supports them.
- Do not generate comments, trailing commas, or markdown fences around the JSON.

For `multiple_choice`:

- Keep the four `choices` mutually exclusive.
- Ensure exactly one answer is correct.
- Keep `answer` aligned with the final choice order.

For `drag_and_drop`:

- Use at least two pairs.
- Keep `left` values unique.
- Keep `right` values unique.
- Make pairs semantically clear enough that each match has one correct resolution.
- Avoid synonyms so close that multiple matches could appear valid.

For both types:

- Prefer concise `explanation` values that justify the answer.
- Use `hint` only when there is a genuinely useful clue that does not reveal the answer directly.
- Keep wording stable between regenerations when you want deterministic ids and content hashes.

## 10. Example Minimal Quiz

```json
{
  "version": 1,
  "title": "Simple Physics Drill",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "What is 2 + 2?",
      "choices": ["3", "4", "5", "6"],
      "answer": 1,
      "hint": "Add the number to itself once."
    },
    {
      "id": "q2",
      "type": "drag_and_drop",
      "question": "Match the quantity to the formula.",
      "pairs": [
        {
          "left": "Force",
          "right": "F = ma"
        },
        {
          "left": "Momentum",
          "right": "p = mv"
        }
      ]
    }
  ]
}
```

## 11. Example With ZIP Assets

```json
{
  "id": "animal-recognition-basics",
  "version": 1,
  "title": "Animal Recognition Basics",
  "description": "Identify simple animals from pictures.",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "Which animal is shown in the picture?",
      "image": "assets/cat.webp",
      "choices": ["Dog", "Cat", "Rabbit", "Fox"],
      "answer": 1,
      "explanation": "The image shows a cat.",
      "hint": "Think of the most common small pet with whiskers."
    }
  ]
}
```

## 12. Recommendations For Future Versions

Future versions can extend the schema with new question types or metadata, but version 1 generators should not emit fields for unsupported features such as:

- fill-in-the-blank
- flashcards
- timed modes beyond whole-quiz tracking
- tags
- categories
- spaced repetition

If a future version adds those features, it should increase `version` and document the new fields explicitly.
