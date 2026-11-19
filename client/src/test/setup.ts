/// <reference types="@testing-library/jest-dom/vitest" />
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

// Registered explicitly (rather than via '@testing-library/jest-dom/vitest')
// so the matchers attach to the same `expect` instance the tests import,
// even when Windows drive-letter casing makes Node load vitest twice.
expect.extend(matchers);

afterEach(() => {
  cleanup();
});
