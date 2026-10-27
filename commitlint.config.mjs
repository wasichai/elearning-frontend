// Conventional Commits; asunto en español y sin límite de mayúsculas (la misma regla que elearning-backend)
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0],
    'body-max-line-length': [2, 'always', 100],
    'header-max-length': [2, 'always', 100]
  }
}
