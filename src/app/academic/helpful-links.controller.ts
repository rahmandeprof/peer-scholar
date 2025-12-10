import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/app/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/app/users/entities/user.entity';
import { HelpfulLinksService } from './helpful-links.service';
import { CreateHelpfulLinkDto, UpdateHelpfulLinkDto } from './dtos/helpful-link.dto';

@Controller('helpful-links')
export class HelpfulLinksController {
    constructor(private readonly helpfulLinksService: HelpfulLinksService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() dto: CreateHelpfulLinkDto, @CurrentUser() user: User) {
        return this.helpfulLinksService.create(dto, user.id);
    }

    @Get('material/:materialId')
    findByMaterial(@Param('materialId') materialId: string) {
        return this.helpfulLinksService.findByMaterial(materialId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.helpfulLinksService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(
        @Param('id') id: string,
        @Body() dto: UpdateHelpfulLinkDto,
        @CurrentUser() user: User,
    ) {
        return this.helpfulLinksService.update(id, dto, user.id);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string, @CurrentUser() user: User) {
        return this.helpfulLinksService.remove(id, user.id);
    }

    @Post(':id/helpful')
    @UseGuards(JwtAuthGuard)
    markHelpful(@Param('id') id: string) {
        return this.helpfulLinksService.markHelpful(id);
    }
}
