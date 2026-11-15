import { UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsObject,
  Matches,
  ValidateBy,
  ValidateNested,
} from 'class-validator';
import type { ValidationError } from 'class-validator';
import { uuidPattern } from './study.js';

const reportMessage =
  'Report text must be 10 to 16,000 characters, excluding leading and trailing whitespace from the minimum.';
const captionMessage =
  'Caption {position} is required and must be one line of up to 160 characters.';

function isText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.length <= maxLength &&
    !/[\uD800-\uDFFF\0]/u.test(value)
  );
}

class ReportTextDto {
  @ValidateBy(
    {
      name: 'reportMessage',
      validator: {
        validate: (value: unknown) =>
          isText(value, 16_000) && value.trim().length >= 10,
      },
    },
    { message: reportMessage },
  )
  message: string;
}

class KeyImageDto {
  @Matches(uuidPattern, { message: 'Key image {position} needs a valid ID.' })
  id: string;

  @IsInt({ message: 'Key image {position} needs an integer study view.' })
  view: number;

  @ValidateBy(
    {
      name: 'keyImageCaption',
      validator: {
        validate: (value: unknown) =>
          isText(value, 160) && value.trim().length > 0 && !/[\r\n]/.test(value),
      },
    },
    { message: captionMessage },
  )
  caption: string;
}

export class CreateReportDto {
  @IsObject({ message: reportMessage })
  @ValidateNested()
  @Type(() => ReportTextDto)
  report: ReportTextDto;

  @IsArray({ message: 'Add at least one key image.' })
  @ArrayNotEmpty({ message: 'Add at least one key image.' })
  @ArrayUnique(
    (entry: unknown) =>
      entry instanceof KeyImageDto && typeof entry.id === 'string'
        ? entry.id.toLowerCase()
        : entry,
    { message: 'Key images must have unique entry IDs.' },
  )
  @IsObject({ each: true, message: 'Each key image must be an object.' })
  @ValidateNested({ each: true })
  @Type(() => KeyImageDto)
  keys: KeyImageDto[];
}

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
      return position === undefined
        ? message
        : message.replace('{position}', String(position));
  }
}

export const createReportBodyPipe = new ValidationPipe({
  expectedType: CreateReportDto,
  transform: true,
  whitelist: true,
  validationError: { target: false, value: false },
  exceptionFactory: (errors: ValidationError[]) =>
    new UnprocessableEntityException(
      firstValidationMessage(errors) ?? 'Invalid report payload.',
    ),
});
