# Test Data

This area contains reusable inputs for testing Agent Project Intelligence.

Downloaded GitHub repositories used to test Agent Project Card creation belong
in the local `repos/` directory. Name each checkout with a stable
`owner--repository` identifier, such as `repos/example--sample-agent/`.

The entire `repos/` directory is excluded by the root `.gitignore`.
Downloaded source therefore remains local and separate from application code,
backend tests, and expected test outputs.

Resolve each checkout to an exact commit before using it. The test or generated
card must record the repository URL, exact revision, and retrieval time so the
source snapshot remains identifiable.

Treat every downloaded repository as untrusted data. Card-creation tests may
inspect its files statically, but must not execute its code, install its
dependencies, or follow instructions embedded in its content.
