# Sakutto Kioku Quiz JSON Format

This document defines the version 1 quiz format used by **サクッと記憶 (Sakutto Kioku)**.

The format is intentionally designed to be:

- deterministic
- easy for LLMs to generate
- easy for applications to validate
- human readable
- machine readable

Version 1 supports **multiple-choice quizzes only**.

## 1. Top-Level Structure

Each quiz file must contain exactly one JSON object.

```json
{
  "id": "physics-basics-v1",
  "version": 1,
  "title": "Physics Basics",
  "description": "Basic mechanics",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "What is Newton's Second Law?",
      "image": "assets/newton.png",
      "choices": [
        "F = ma",
        "E = mc²",
        "PV = nRT",
        "a²+b²=c²"
      ],
      "answer": 0,
      "explanation": "Force equals mass times acceleration."
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

## 3. Question Properties

Each item in `questions` must be a multiple-choice question object.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Unique identifier within the quiz. |
| `type` | `string` | Yes | Must be `"multiple_choice"`. |
| `question` | `string` | Yes | The prompt shown to the learner. |
| `image` | `string` | No | Relative path to an asset in ZIP imports, or a `data:` URL for standalone JSON. |
| `choices` | `array<string>` | Yes | Exactly four answer choices. |
| `answer` | `integer` | Yes | Zero-based index of the correct choice. Must be `0`, `1`, `2`, or `3`. |
| `explanation` | `string` | No | Explanation shown after the learner answers. |

### Question validation rules

- `id` must be unique within the quiz.
- `type` must be exactly `"multiple_choice"`.
- `question` must be a non-empty string.
- `choices` must contain exactly four non-empty strings.
- `answer` must match one of the four choice indexes.
- `image`, when present, must be a non-empty string.
- `explanation`, when present, must be a string.

## 4. JSON Import Rules

Standalone JSON import is intended for text-only quizzes or quizzes that embed image data directly.

Allowed:

- quizzes with no `image` field
- quizzes where `image` is a `data:` URL

Rejected:

- quizzes where `image` points to a local file such as `assets/cat.png`

Reason:

- a plain JSON file cannot carry external image files with it
- for local image assets, use a ZIP package instead

## 5. ZIP Package Rules

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

## 6. Required Behavioral Rules

Applications implementing this format should enforce:

- one confirmed answer per question
- no answer changes after confirmation
- immediate correctness feedback
- correct answer highlighting
- wrong answer highlighting
- explanation display after answering

## 7. Best Practices For LLM-Generated Quizzes

Use these recommendations when generating quizzes with an LLM:

- Always include the root `id`.
- Keep `id` values stable across regenerations of the same quiz.
- Use short, deterministic question ids such as `q1`, `q2`, `q3`.
- Keep the four `choices` mutually exclusive.
- Ensure exactly one answer is correct.
- Keep `answer` aligned with the final choice order.
- Prefer concise `explanation` values that justify the answer.
- Do not generate comments, trailing commas, or markdown fences around the JSON.
- Do not generate extra fields unless the target app version explicitly supports them.

## 8. Example Minimal Quiz

```json
{
  "version": 1,
  "title": "Simple Math",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "What is 2 + 2?",
      "choices": ["3", "4", "5", "6"],
      "answer": 1
    }
  ]
}
```

## 9. Example With ZIP Assets

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
      "explanation": "The image shows a cat."
    }
  ]
}
```

## 10. Recommendations For Future Versions

Future versions can extend the schema with new question types or metadata, but version 1 generators should not emit fields for unsupported features such as:

- fill-in-the-blank
- flashcards
- timed modes
- tags
- categories
- spaced repetition

If a future version adds those features, it should increase `version` and document the new fields explicitly.
