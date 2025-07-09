import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

@Injectable()
export class GoogleService {
  private readonly oauth2Client;

  constructor(private readonly configService: ConfigService) {
    // Initialize OAuth2 client with credentials from environment variables
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT_URI'),
    );
    this.oauth2Client.setCredentials({
      access_token: this.configService.get('GOOGLE_OAUTH_ACCESS_TOKEN'),
      refresh_token: this.configService.get('GOOGLE_OAUTH_REFRESH_TOKEN'),
      scope: "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar",
      token_type: "Bearer",
      expiry_date: 1752096182165
    });
  }

  /**
   * Generate the Google OAuth2 authentication URL
   * @returns URL to redirect the user to for authentication
   */
  getAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token for offline access
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly',
      ],
    });
  }

  /**
   * Handle the OAuth2 redirect callback
   * @param code Authorization code from Google
   * @returns OAuth2 tokens
   */
  async handleRedirect(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      return tokens;
    } catch (error) {
      console.error('Error getting tokens:', error);
      throw new UnauthorizedException('Failed to authenticate with Google');
    }
  }

  /**
   * Get the Google Calendar API client
   * @returns Google Calendar API client
   */
  getCalendar() {
    if (!this.oauth2Client.credentials) {
      throw new UnauthorizedException('Not authenticated with Google Calendar');
    }
    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Get events for the current week
   * @returns List of events for the current week
   */
  async getWeekEvents() {
    try {
      const calendar = this.getCalendar();

      // Calculate start and end of current week
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
      endOfWeek.setHours(23, 59, 59, 999);

      return calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfWeek.toISOString(),
        timeMax: endOfWeek.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 10,
      });
    } catch (error) {
      console.error('Error fetching events:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error.code === 401) {
        throw new UnauthorizedException('Authentication token expired');
      }
      throw new InternalServerErrorException(`Failed to fetch events: ${error.message}`);
    }
  }

  /**
   * Create a new event in the user's calendar
   * @param eventData Event data to create
   * @returns Created event
   */
  async createEvent(eventData) {
    try {
      const calendar = this.getCalendar();

      return calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventData,
      });
    } catch (error) {
      console.error('Error creating event:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error.code === 401) {
        throw new UnauthorizedException('Authentication token expired');
      }
      if (error.code === 400) {
        throw new BadRequestException(`Invalid event data: ${error.message}`);
      }
      throw new InternalServerErrorException(`Failed to create event: ${error.message}`);
    }
  }
}
