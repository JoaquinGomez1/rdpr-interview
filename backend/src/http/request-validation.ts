import { UnprocessableEntityException } from '@nestjs/common';
import type { ValidationPipeOptions } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

function firstValidationMessage(
  errors: ValidationError[],
  position?: number,
): string | undefined {
  for (const error of errors) {
    const entryPosition = /^\d+$/.test(error.property)
      ? Number(error.property) + 1
      : position;
    const message =
      Object.values(error.constraints ?? {})[0] ??
      firstValidationMessage(error.children ?? [], entryPosition);
    if (message)
      return entryPosition === undefined
        ? message
        : message.replace('{position}', String(entryPosition));
  }
}

export const requestValidationOptions: ValidationPipeOptions = {
  transform: true,
  whitelist: true,
  validationError: { target: false, value: false },
  exceptionFactory: (errors: ValidationError[]) =>
    new UnprocessableEntityException(
      firstValidationMessage(errors) ?? 'Invalid request payload.',
    ),
};
