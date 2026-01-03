import {
    Controller,
    Post,
    Get,
    Patch,
    Param,
    Body,
    UseGuards,
    Request,
    ParseUUIDPipe,
    NotFoundException,
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
        const unreadCount = await this.feedbackService.countUnread();
        return {
            success: true,
            count,
            unreadCount,
            feedbacks,
        };
    }

    /**
     * Get unread feedback count (admin only)
     */
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Role('admin')
    @Get('unread-count')
    async getUnreadCount() {
        const unreadCount = await this.feedbackService.countUnread();
        return { success: true, unreadCount };
    }

    /**
     * Toggle feedback read status (admin only)
     */
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Role('admin')
    @Patch(':id/read')
    async toggleRead(@Param('id', new ParseUUIDPipe()) id: string) {
        const feedback = await this.feedbackService.toggleRead(id);
        if (!feedback) {
            throw new NotFoundException('Feedback not found');
        }
        return {
            success: true,
            isRead: feedback.isRead,
        };
    }
}
