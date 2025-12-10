import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BadgeService } from './badge.service';

@Controller('badges')
@UseGuards(AuthGuard('jwt'))
export class BadgeController {
    constructor(private readonly badgeService: BadgeService) { }

    // Get current user's badges
    @Get('my')
    async getMyBadges(@Req() req: { user: { id: string } }) {
        const badges = await this.badgeService.getUserBadges(req.user.id);
        return badges.map((badge) => ({
            ...badge,
            info: this.badgeService.getBadgeInfo(badge.badgeType),
        }));
    }

    // Get all available badge definitions
    @Get('definitions')
    getAllDefinitions() {
        return this.badgeService.getAllBadgeDefinitions();
    }
}
