export class PhoneHelper {
    /**
     * Format số điện thoại cho Twilio
     * Format: +84 XXX XXX XXX (có khoảng trắng)
     */
    static formatVietNamPhoneForTwilio(phoneNumber: string): string {
        if (!phoneNumber) {
            throw new Error('Phone number is required');
        }

        // Loại bỏ mọi ký tự đặc biệt
        let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

        let formatted = '';

        // Convert về dạng +84XXXXXXXXX
        if (cleaned.startsWith('+84')) {
            formatted = cleaned;
        } else if (cleaned.startsWith('84')) {
            formatted = `+${cleaned}`;
        } else if (cleaned.startsWith('0')) {
            formatted = `+84${cleaned.substring(1)}`;
        } else {
            formatted = `+84${cleaned}`;
        }

        // Thêm khoảng trắng: +84865104205 -> +84 865 104 205
        if (formatted.startsWith('+84') && formatted.length === 12) {
            const prefix = '+84';
            const number = formatted.substring(3); // 865104205

            // Format: +84 XXX XXX XXX
            return `${prefix} ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
        }

        return formatted;
    }

    /**
     * Format bình thường (không có khoảng trắng)
     */
    static formatVietNamPhone(phoneNumber: string): string {
        if (!phoneNumber) {
            throw new Error('Phone number is required');
        }

        let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

        if (cleaned.startsWith('+84')) {
            return cleaned;
        }
        if (cleaned.startsWith('84')) {
            return `+${cleaned}`;
        }
        if (cleaned.startsWith('0')) {
            return `+84${cleaned.substring(1)}`;
        }
        return `+84${cleaned}`;
    }

    static isValidVietNamPhone(phoneNumber: string): boolean {
        const formatted = this.formatVietNamPhone(phoneNumber);
        const vnPhoneRegex = /^\+84[3|5|7|8|9][0-9]{8}$/;
        return vnPhoneRegex.test(formatted);
    }
}