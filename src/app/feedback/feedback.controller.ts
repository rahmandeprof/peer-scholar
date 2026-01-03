import {
    Controller,
    Post,
    Get,
    Body,
    UseGuards,
    Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { RolesGuard } from '@/app/auth/guards/roles.guard';
import { Role } from '@/app/auth/decorators';

@Controller('feedback')
export class FeedbackController {
    constructor(private readonly feedbackService: FeedbackService) { }

    /**
     * Submit feedback (authenticated users only)
     */
    @UseGuards(AuthGuard('jwt'))
    @Post()
    async create(@Body() dto: CreateFeedbackDto, @Request() req: any) {
        const feedback = await this.feedbackService.create(dto, req.user);
        return {
            success: true,
            message: 'Thank you for your feedback!',
            id: feedback.id,
        };
    }

    /**
     * List all feedbacks (admin only)
     */
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Role('admin')
    @Get()
    async findAll() {
        const feedbacks = await this.feedbackService.findAll();
        const count = await this.feedbackService.count();
        return {
            success: true,
            count,
            feedbacks,
        };
    }
}
