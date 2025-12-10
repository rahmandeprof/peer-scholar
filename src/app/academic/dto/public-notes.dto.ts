import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreatePublicNoteDto {
    @IsString()
    @MinLength(1)
    selectedText!: string;

    @IsString()
    @MinLength(1)
    note!: string;

    @IsInt()
    @Min(1)
    @IsOptional()
    pageNumber?: number;

    @IsString()
    @IsOptional()
    contextBefore?: string;

    @IsString()
    @IsOptional()
    contextAfter?: string;
}

export class VotePublicNoteDto {
    @IsInt()
    value!: number; // 1 for upvote, -1 for downvote
}
