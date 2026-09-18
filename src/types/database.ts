export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          whatsapp_number: string | null;
          whatsapp_access_token: string | null;
          whatsapp_waba_id: string | null;
          wechat_corp_id: string | null;
          wechat_agent_id: string | null;
          wechat_secret: string | null;
          industry: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: string;
          subscription_current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          whatsapp_number?: string | null;
          whatsapp_access_token?: string | null;
          whatsapp_waba_id?: string | null;
          wechat_corp_id?: string | null;
          wechat_agent_id?: string | null;
          wechat_secret?: string | null;
          industry?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string;
          subscription_current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          whatsapp_number?: string | null;
          whatsapp_access_token?: string | null;
          whatsapp_waba_id?: string | null;
          wechat_corp_id?: string | null;
          wechat_agent_id?: string | null;
          wechat_secret?: string | null;
          industry?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string;
          subscription_current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          description: string | null;
          moq: string | null;
          price_range: string | null;
          lead_time: string | null;
          specs: Json | null;
          category: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          description?: string | null;
          moq?: string | null;
          price_range?: string | null;
          lead_time?: string | null;
          specs?: Json | null;
          category?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          description?: string | null;
          moq?: string | null;
          price_range?: string | null;
          lead_time?: string | null;
          specs?: Json | null;
          category?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          company_id: string;
          channel: string;
          contact_phone: string | null;
          contact_name: string | null;
          contact_wechat_id: string | null;
          status: string;
          detected_language: string | null;
          handoff_summary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          channel: string;
          contact_phone?: string | null;
          contact_name?: string | null;
          contact_wechat_id?: string | null;
          status?: string;
          detected_language?: string | null;
          handoff_summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          channel?: string;
          contact_phone?: string | null;
          contact_name?: string | null;
          contact_wechat_id?: string | null;
          status?: string;
          detected_language?: string | null;
          handoff_summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          tokens_used: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: string;
          content: string;
          tokens_used?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: string;
          content?: string;
          tokens_used?: number | null;
          created_at?: string;
        };
      };
      faq_rules: {
        Row: {
          id: string;
          company_id: string;
          question_pattern: string;
          answer: string;
          keywords: string[];
          priority: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          question_pattern: string;
          answer: string;
          keywords?: string[];
          priority?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          question_pattern?: string;
          answer?: string;
          keywords?: string[];
          priority?: number;
          created_at?: string;
        };
      };
      knowledge_base: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          content: string;
          file_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          content: string;
          file_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          content?: string;
          file_type?: string | null;
          created_at?: string;
        };
      };
      company_settings: {
        Row: {
          id: string;
          company_id: string;
          system_prompt: string | null;
          industry: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          system_prompt?: string | null;
          industry?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          system_prompt?: string | null;
          industry?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          company_id: string | null;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          company_id?: string | null;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          company_id?: string | null;
          role?: string;
          created_at?: string;
        };
      };
    };
  };
}
