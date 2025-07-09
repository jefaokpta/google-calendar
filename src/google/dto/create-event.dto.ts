import { IsString, IsDateString, IsOptional, IsArray } from 'class-validator';

export class CreateEventDto {
  @IsString()
  summary: string;

  @IsDateString()
  start: string;

  @IsDateString()
  end: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  attendees?: { email: string }[];
}