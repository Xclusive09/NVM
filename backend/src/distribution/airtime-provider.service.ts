import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface AirtimeResult {
  success: boolean;
  reference?: string;
  errorMessage?: string;
}

export interface DataPlanInfo {
  id: string;
  code: string;
  name: string;
  price: number;
  validity: string;
  dataSize: string;
}

@Injectable()
export class AirtimeProviderService {
  private readonly logger = new Logger(AirtimeProviderService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get('AIRTIME_PROVIDER_BASE_URL') || '';
    this.apiKey = this.configService.get('AIRTIME_PROVIDER_API_KEY') || '';
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async sendAirtime(
    phoneNumber: string,
    amount: number,
    network: string,
  ): Promise<AirtimeResult> {
    try {
      // This is a mock implementation. Replace with actual provider API
      this.logger.log(`Sending ${amount} airtime to ${phoneNumber} on ${network}`);
      
      // Simulate API call - replace with actual provider integration
      // For development/testing, we'll simulate success/failure
      const isSuccess = Math.random() > 0.1; // 90% success rate for testing
      
      if (isSuccess) {
        return {
          success: true,
          reference: `AIR-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        };
      } else {
        return {
          success: false,
          errorMessage: 'Simulated failure for testing',
        };
      }

      // Real implementation would look like:
      /*
      const response = await axios.post(
        `${this.baseUrl}/airtime/purchase`,
        {
          phone: phoneNumber,
          amount,
          network,
        },
        { headers: this.getHeaders() },
      );

      if (response.data.success) {
        return {
          success: true,
          reference: response.data.reference,
        };
      } else {
        return {
          success: false,
          errorMessage: response.data.message,
        };
      }
      */
    } catch (error) {
      this.logger.error('Airtime send failed', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendData(
    phoneNumber: string,
    planCode: string,
    network: string,
  ): Promise<AirtimeResult> {
    try {
      this.logger.log(`Sending data plan ${planCode} to ${phoneNumber} on ${network}`);
      
      // Simulate API call - replace with actual provider integration
      const isSuccess = Math.random() > 0.1; // 90% success rate for testing
      
      if (isSuccess) {
        return {
          success: true,
          reference: `DATA-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        };
      } else {
        return {
          success: false,
          errorMessage: 'Simulated failure for testing',
        };
      }
    } catch (error) {
      this.logger.error('Data send failed', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getDataPlans(network: string): Promise<DataPlanInfo[]> {
    // This is mock data. Replace with actual provider API
    const mockPlans: Record<string, DataPlanInfo[]> = {
      MTN: [
        { id: 'mtn-500mb', code: 'MTN500', name: 'MTN 500MB', price: 150, validity: '30 days', dataSize: '500MB' },
        { id: 'mtn-1gb', code: 'MTN1GB', name: 'MTN 1GB', price: 250, validity: '30 days', dataSize: '1GB' },
        { id: 'mtn-2gb', code: 'MTN2GB', name: 'MTN 2GB', price: 500, validity: '30 days', dataSize: '2GB' },
        { id: 'mtn-5gb', code: 'MTN5GB', name: 'MTN 5GB', price: 1000, validity: '30 days', dataSize: '5GB' },
        { id: 'mtn-10gb', code: 'MTN10GB', name: 'MTN 10GB', price: 2500, validity: '30 days', dataSize: '10GB' },
      ],
      AIRTEL: [
        { id: 'airtel-500mb', code: 'AIRTEL500', name: 'Airtel 500MB', price: 150, validity: '30 days', dataSize: '500MB' },
        { id: 'airtel-1gb', code: 'AIRTEL1GB', name: 'Airtel 1GB', price: 250, validity: '30 days', dataSize: '1GB' },
        { id: 'airtel-2gb', code: 'AIRTEL2GB', name: 'Airtel 2GB', price: 500, validity: '30 days', dataSize: '2GB' },
        { id: 'airtel-5gb', code: 'AIRTEL5GB', name: 'Airtel 5GB', price: 1000, validity: '30 days', dataSize: '5GB' },
      ],
      GLO: [
        { id: 'glo-500mb', code: 'GLO500', name: 'Glo 500MB', price: 100, validity: '30 days', dataSize: '500MB' },
        { id: 'glo-1gb', code: 'GLO1GB', name: 'Glo 1GB', price: 200, validity: '30 days', dataSize: '1GB' },
        { id: 'glo-2gb', code: 'GLO2GB', name: 'Glo 2GB', price: 400, validity: '30 days', dataSize: '2GB' },
        { id: 'glo-5gb', code: 'GLO5GB', name: 'Glo 5GB', price: 800, validity: '30 days', dataSize: '5GB' },
      ],
      NINE_MOBILE: [
        { id: '9mobile-500mb', code: '9MOB500', name: '9mobile 500MB', price: 150, validity: '30 days', dataSize: '500MB' },
        { id: '9mobile-1gb', code: '9MOB1GB', name: '9mobile 1GB', price: 250, validity: '30 days', dataSize: '1GB' },
        { id: '9mobile-2gb', code: '9MOB2GB', name: '9mobile 2GB', price: 500, validity: '30 days', dataSize: '2GB' },
      ],
    };

    return mockPlans[network] || [];
  }
}
