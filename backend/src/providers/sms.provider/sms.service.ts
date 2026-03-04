import {BadRequestException, Injectable} from "@nestjs/common";
import twilio from 'twilio';
import {ConfigService} from "@nestjs/config";
import {PhoneHelper} from "../../utils/phone.helper";
@Injectable()
export class SmsService {
    private twilioClient: twilio.Twilio;

    constructor(private configService: ConfigService) {
        const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
        const authToken = this.configService.get('TWILIO_AUTH_TOKEN');

        this.twilioClient = twilio(accountSid, authToken);
    }


    async sendSms(to: string, message: string) {
        try {
            console.log(' [SMS] Input phone:', to);

            // Format với KHOẢNG TRẮNG cho Twilio
            const formattedPhone = PhoneHelper.formatVietNamPhoneForTwilio(to);

            console.log(' [SMS] Formatted phone (for Twilio):', formattedPhone);
            console.log(' [SMS] Message:', message);

            // Validate
            if (!PhoneHelper.isValidVietNamPhone(to)) {
                throw new BadRequestException('Số điện thoại không hợp lệ');
            }

            const result = await this.twilioClient.messages.create({
                body: message,
                from: this.configService.get('TWILIO_PHONE_NUMBER'),
                to: formattedPhone, // Gửi với format: +84 865 104 205
            });

            console.log('✅ [SMS] Sent successfully! SID:', result.sid);

            return {
                success: true,
                messageId: result.sid,
                to: formattedPhone,
            };
        } catch (error) {
            console.error(' [SMS] Error:', error.message);

            return {
                success: false,
                error: error.message,
            };
        }
    }



}
