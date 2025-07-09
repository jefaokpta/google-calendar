import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  Res, 
  HttpStatus, 
  HttpException,
  InternalServerErrorException,
  Logger
} from '@nestjs/common';
import { Response } from 'express';
import { GoogleService } from './google.service';
import { CreateEventDto } from './dto/create-event.dto';

@Controller()
export class GoogleController {
  private readonly logger = new Logger(GoogleController.name);

  constructor(private readonly googleService: GoogleService) {}

  /**
   * Redirect user to Google OAuth2 consent screen
   */
  @Get('authenticate')
  authenticate(@Res() res: Response) {
    try {
      const authUrl = this.googleService.getAuthUrl();
      return res.redirect(authUrl);
    } catch (error) {
      this.logger.error(`Authentication redirect failed: ${error.message}`, error.stack);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to generate authentication URL',
        error: error.message
      });
    }
  }

  /**
   * Handle OAuth2 callback from Google
   * @param code Authorization code from Google
   */
  @Get('redirect')
  async handleRedirect(@Query('code') code: string, @Res() res: Response) {
    try {
      if (!code) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Authorization code is required'
        });
      }

      const tokens = await this.googleService.handleRedirect(code);
      return res.status(HttpStatus.OK).json({ 
        message: 'Authentication successful', 
        tokens 
      });
    } catch (error) {
      this.logger.error(`OAuth callback failed: ${error.message}`, error.stack);

      // Use the status code from the error if it's an HttpException
      const status = error instanceof HttpException 
        ? error.getStatus() 
        : HttpStatus.INTERNAL_SERVER_ERROR;

      return res.status(status).json({ 
        message: 'Authentication failed', 
        error: error.message 
      });
    }
  }

  /**
   * Get events for the current week
   */
  @Get('week')
  async getWeekEvents() {
    try {
      const events = await this.googleService.getWeekEvents();
      return events.data;
    } catch (error) {
      this.logger.error(`Failed to fetch events: ${error.message}`, error.stack);

      // Re-throw HttpExceptions as they already have appropriate status codes
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to fetch events: ${error.message}`);
    }
  }

  /**
   * Create a new event in the user's calendar
   * @param createEventDto Event data to create
   */
  @Post('create')
  async createEvent(@Body() createEventDto: CreateEventDto) {
    try {
      // Transform DTO to Google Calendar event format
      const eventData = {
        summary: createEventDto.summary,
        description: createEventDto.description,
        start: {
          dateTime: createEventDto.start,
          timeZone: 'UTC',
        },
        end: {
          dateTime: createEventDto.end,
          timeZone: 'UTC',
        },
        attendees: createEventDto.attendees,
      };

      const event = await this.googleService.createEvent(eventData);
      return event.data;
    } catch (error) {
      this.logger.error(`Failed to create event: ${error.message}`, error.stack);

      // Re-throw HttpExceptions as they already have appropriate status codes
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to create event: ${error.message}`);
    }
  }
}
