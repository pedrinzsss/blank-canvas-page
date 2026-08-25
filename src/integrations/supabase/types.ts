export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_collaborators: {
        Row: {
          created_at: string | null
          email: string
          id: string
          password: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          password: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          password?: string
          role?: string | null
        }
        Relationships: []
      }
      affiliations: {
        Row: {
          affiliate_user_id: string
          commission_percent: number
          created_at: string
          id: string
          product_id: string
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_user_id: string
          commission_percent?: number
          created_at?: string
          id?: string
          product_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_user_id?: string
          commission_percent?: number
          created_at?: string
          id?: string
          product_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      antecipacoes: {
        Row: {
          amount_cents: number
          available_at: string | null
          charge_id: string | null
          created_at: string | null
          customer_name: string | null
          id: string
          payment_method: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          available_at?: string | null
          charge_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          id?: string
          payment_method: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          available_at?: string | null
          charge_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          id?: string
          payment_method?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "antecipacoes_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
        ]
      }
      api_clients: {
        Row: {
          created_at: string
          environment: Database["public"]["Enums"]["api_env"]
          id: string
          name: string
          updated_at: string
          user_id: string
          webhook_secret_hash: string | null
          webhook_secret_prefix: string | null
        }
        Insert: {
          created_at?: string
          environment: Database["public"]["Enums"]["api_env"]
          id?: string
          name: string
          updated_at?: string
          user_id: string
          webhook_secret_hash?: string | null
          webhook_secret_prefix?: string | null
        }
        Update: {
          created_at?: string
          environment?: Database["public"]["Enums"]["api_env"]
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          webhook_secret_hash?: string | null
          webhook_secret_prefix?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          client_id: string
          created_at: string
          id: string
          last_used_at: string | null
          public_key: string
          revoked_at: string | null
          secret_key_hash: string
          secret_key_prefix: string
          status: Database["public"]["Enums"]["api_key_status"]
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          public_key: string
          revoked_at?: string | null
          secret_key_hash: string
          secret_key_prefix: string
          status?: Database["public"]["Enums"]["api_key_status"]
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          public_key?: string
          revoked_at?: string | null
          secret_key_hash?: string
          secret_key_prefix?: string
          status?: Database["public"]["Enums"]["api_key_status"]
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          data: Json
          id: string
          ip: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          data?: Json
          id?: string
          ip?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          data?: Json
          id?: string
          ip?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      charges: {
        Row: {
          acquirer: string | null
          acquirer_ref: string | null
          amount_cents: number
          client_id: string
          created_at: string
          currency: string
          customer_id: string | null
          description: string | null
          id: string
          metadata: Json
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          pix_expiration_at: string | null
          pix_qrcode: string | null
          secure_url: string | null
          status: Database["public"]["Enums"]["charge_status"]
          updated_at: string
        }
        Insert: {
          acquirer?: string | null
          acquirer_ref?: string | null
          amount_cents: number
          client_id: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          pix_expiration_at?: string | null
          pix_qrcode?: string | null
          secure_url?: string | null
          status?: Database["public"]["Enums"]["charge_status"]
          updated_at?: string
        }
        Update: {
          acquirer?: string | null
          acquirer_ref?: string | null
          amount_cents?: number
          client_id?: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          pix_expiration_at?: string | null
          pix_qrcode?: string | null
          secure_url?: string | null
          status?: Database["public"]["Enums"]["charge_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charges_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_settings: {
        Row: {
          background_color: string
          builder_config: Json
          button_color: string
          button_text: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          layout: string
          logo_url: string | null
          offer_id: string
          primary_color: string
          published: boolean
          published_at: string | null
          secondary_color: string
          show_description: boolean
          show_faq: boolean
          show_guarantee: boolean
          show_logo: boolean
          show_testimonials: boolean
          show_timer: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          background_color?: string
          builder_config?: Json
          button_color?: string
          button_text?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          layout?: string
          logo_url?: string | null
          offer_id: string
          primary_color?: string
          published?: boolean
          published_at?: string | null
          secondary_color?: string
          show_description?: boolean
          show_faq?: boolean
          show_guarantee?: boolean
          show_logo?: boolean
          show_testimonials?: boolean
          show_timer?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          background_color?: string
          builder_config?: Json
          button_color?: string
          button_text?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          layout?: string
          logo_url?: string | null
          offer_id?: string
          primary_color?: string
          published?: boolean
          published_at?: string | null
          secondary_color?: string
          show_description?: boolean
          show_faq?: boolean
          show_guarantee?: boolean
          show_logo?: boolean
          show_testimonials?: boolean
          show_timer?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_settings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: true
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: Database["public"]["Enums"]["coupon_type"]
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          offer_ids: string[]
          updated_at: string
          user_id: string
          uses_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type: Database["public"]["Enums"]["coupon_type"]
          discount_value: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          offer_ids?: string[]
          updated_at?: string
          user_id: string
          uses_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["coupon_type"]
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          offer_ids?: string[]
          updated_at?: string
          user_id?: string
          uses_count?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip_code: string | null
          client_id: string
          created_at: string
          document: string | null
          email: string | null
          id: string
          metadata: Json
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          client_id: string
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          metadata?: Json
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          client_id?: string
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          metadata?: Json
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          created_at: string
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kyc_bank_accounts: {
        Row: {
          account_number: string
          account_type: string
          agency: string
          bank_name: string
          created_at: string
          holder_document: string
          holder_name: string
          id: string
          pix_key: string | null
          status: string
          submission_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          account_type: string
          agency: string
          bank_name: string
          created_at?: string
          holder_document: string
          holder_name: string
          id?: string
          pix_key?: string | null
          status?: string
          submission_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          account_type?: string
          agency?: string
          bank_name?: string
          created_at?: string
          holder_document?: string
          holder_name?: string
          id?: string
          pix_key?: string | null
          status?: string
          submission_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_bank_accounts_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "kyc_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string | null
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          submission_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          submission_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          submission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_documents_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "kyc_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_submissions: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          admin_notes: string | null
          avg_ticket_cents: number | null
          birth_date: string | null
          company_name: string | null
          created_at: string
          document: string | null
          email: string | null
          full_name: string | null
          id: string
          monthly_income_cents: number | null
          mother_name: string | null
          occupation: string | null
          person_type: Database["public"]["Enums"]["kyc_person_type"]
          phone: string | null
          products_description: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          submitted_at: string | null
          trade_name: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          admin_notes?: string | null
          avg_ticket_cents?: number | null
          birth_date?: string | null
          company_name?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          monthly_income_cents?: number | null
          mother_name?: string | null
          occupation?: string | null
          person_type: Database["public"]["Enums"]["kyc_person_type"]
          phone?: string | null
          products_description?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string | null
          trade_name?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          admin_notes?: string | null
          avg_ticket_cents?: number | null
          birth_date?: string | null
          company_name?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          monthly_income_cents?: number | null
          mother_name?: string | null
          occupation?: string | null
          person_type?: Database["public"]["Enums"]["kyc_person_type"]
          phone?: string | null
          products_description?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string | null
          trade_name?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      manual_charges: {
        Row: {
          acquirer: string
          acquirer_ref: string | null
          amount_cents: number
          created_at: string
          customer_email: string | null
          customer_name: string | null
          description: string | null
          external_ref: string
          id: string
          paid_at: string | null
          pix_qrcode: string | null
          secure_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acquirer?: string
          acquirer_ref?: string | null
          amount_cents: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          description?: string | null
          external_ref: string
          id?: string
          paid_at?: string | null
          pix_qrcode?: string | null
          secure_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acquirer?: string
          acquirer_ref?: string | null
          amount_cents?: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          description?: string | null
          external_ref?: string
          id?: string
          paid_at?: string | null
          pix_qrcode?: string | null
          secure_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      manual_transactions: {
        Row: {
          account_id: string | null
          amount_cents: number
          attachment_url: string | null
          category: string
          created_at: string
          date: string
          description: string
          id: string
          ignore_transaction: boolean
          payment_method: string
          received: boolean
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount_cents: number
          attachment_url?: string | null
          category: string
          created_at?: string
          date?: string
          description: string
          id?: string
          ignore_transaction?: boolean
          payment_method: string
          received?: boolean
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount_cents?: number
          attachment_url?: string | null
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          ignore_transaction?: boolean
          payment_method?: string
          received?: boolean
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_areas: {
        Row: {
          comments_config: string
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          product_id: string
          title: string
          updated_at: string
        }
        Insert: {
          comments_config?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          product_id: string
          title: string
          updated_at?: string
        }
        Update: {
          comments_config?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          product_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_areas_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      offer_payment_methods: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          max_installments: number | null
          method: Database["public"]["Enums"]["payment_method"]
          offer_id: string
          show_interest: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          max_installments?: number | null
          method: Database["public"]["Enums"]["payment_method"]
          offer_id: string
          show_interest?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          max_installments?: number | null
          method?: Database["public"]["Enums"]["payment_method"]
          offer_id?: string
          show_interest?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_payment_methods_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          billing_type: Database["public"]["Enums"]["offer_billing_type"]
          checkout_language: string
          checkout_token: string
          created_at: string
          currency: string
          description: string | null
          id: string
          invoice_name: string | null
          max_installments: number
          name: string
          offer_code: string | null
          offer_type: string
          price_cents: number
          product_id: string
          published_at: string | null
          recurrence_frequency: string | null
          sales_page_url: string | null
          show_interest: boolean
          status: Database["public"]["Enums"]["offer_status"]
          support_email: string | null
          support_whatsapp: string | null
          updated_at: string
        }
        Insert: {
          billing_type?: Database["public"]["Enums"]["offer_billing_type"]
          checkout_language?: string
          checkout_token?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          invoice_name?: string | null
          max_installments?: number
          name: string
          offer_code?: string | null
          offer_type?: string
          price_cents?: number
          product_id: string
          published_at?: string | null
          recurrence_frequency?: string | null
          sales_page_url?: string | null
          show_interest?: boolean
          status?: Database["public"]["Enums"]["offer_status"]
          support_email?: string | null
          support_whatsapp?: string | null
          updated_at?: string
        }
        Update: {
          billing_type?: Database["public"]["Enums"]["offer_billing_type"]
          checkout_language?: string
          checkout_token?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          invoice_name?: string | null
          max_installments?: number
          name?: string
          offer_code?: string | null
          offer_type?: string
          price_cents?: number
          product_id?: string
          published_at?: string | null
          recurrence_frequency?: string | null
          sales_page_url?: string | null
          show_interest?: boolean
          status?: Database["public"]["Enums"]["offer_status"]
          support_email?: string | null
          support_whatsapp?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_bumps: {
        Row: {
          bump_offer_id: string | null
          created_at: string
          description: string | null
          display_rule: string
          enabled: boolean
          id: string
          image_url: string | null
          min_total_cents: number | null
          offer_id: string
          payment_methods: string[]
          position: number
          price_cents: number
          title: string
          updated_at: string
        }
        Insert: {
          bump_offer_id?: string | null
          created_at?: string
          description?: string | null
          display_rule?: string
          enabled?: boolean
          id?: string
          image_url?: string | null
          min_total_cents?: number | null
          offer_id: string
          payment_methods?: string[]
          position?: number
          price_cents?: number
          title: string
          updated_at?: string
        }
        Update: {
          bump_offer_id?: string | null
          created_at?: string
          description?: string | null
          display_rule?: string
          enabled?: boolean
          id?: string
          image_url?: string | null
          min_total_cents?: number | null
          offer_id?: string
          payment_methods?: string[]
          position?: number
          price_cents?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_bumps_bump_offer_id_fkey"
            columns: ["bump_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bumps_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_links: {
        Row: {
          amount_cents: number
          client_id: string
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          metadata: Json
          name: string
          status: Database["public"]["Enums"]["link_status"]
          url_slug: string
        }
        Insert: {
          amount_cents: number
          client_id: string
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          name: string
          status?: Database["public"]["Enums"]["link_status"]
          url_slug: string
        }
        Update: {
          amount_cents?: number
          client_id?: string
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          name?: string
          status?: Database["public"]["Enums"]["link_status"]
          url_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount_cents: number
          bank_account: Json
          client_id: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["payout_status"]
        }
        Insert: {
          amount_cents: number
          bank_account?: Json
          client_id: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Update: {
          amount_cents?: number
          bank_account?: Json
          client_id?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payouts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          data: Json
          id: string
          section: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          section: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          section?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      product_coproducers: {
        Row: {
          commission_percent: number
          created_at: string
          id: string
          product_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_percent?: number
          created_at?: string
          id?: string
          product_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_percent?: number
          created_at?: string
          id?: string
          product_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_coproducers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_files: {
        Row: {
          created_at: string
          description: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          product_id: string
          updated_at: string
          video_source: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          product_id: string
          updated_at?: string
          video_source?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          product_id?: string
          updated_at?: string
          video_source?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_files_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          affiliate_commission_percent: number
          affiliate_description: string | null
          affiliation_mode: string
          category: string | null
          created_at: string
          delivery_file_url: string | null
          delivery_type: string
          description: string | null
          different_first_charge: boolean
          first_charge_price_cents: number | null
          id: string
          image_url: string | null
          invoice_name: string | null
          is_active: boolean
          payment_type: string
          price_cents: number | null
          product_type: string
          recurrence_frequency: string | null
          recurrence_price_cents: number | null
          refund_deadline_days: number | null
          sac_display_name: string | null
          sac_email: string | null
          sales_page_url: string | null
          show_in_showcase: boolean
          sku: string | null
          status: Database["public"]["Enums"]["product_status"]
          stock_quantity: number | null
          support_email: string | null
          support_whatsapp: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliate_commission_percent?: number
          affiliate_description?: string | null
          affiliation_mode?: string
          category?: string | null
          created_at?: string
          delivery_file_url?: string | null
          delivery_type?: string
          description?: string | null
          different_first_charge?: boolean
          first_charge_price_cents?: number | null
          id?: string
          image_url?: string | null
          invoice_name?: string | null
          is_active?: boolean
          payment_type?: string
          price_cents?: number | null
          product_type?: string
          recurrence_frequency?: string | null
          recurrence_price_cents?: number | null
          refund_deadline_days?: number | null
          sac_display_name?: string | null
          sac_email?: string | null
          sales_page_url?: string | null
          show_in_showcase?: boolean
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number | null
          support_email?: string | null
          support_whatsapp?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliate_commission_percent?: number
          affiliate_description?: string | null
          affiliation_mode?: string
          category?: string | null
          created_at?: string
          delivery_file_url?: string | null
          delivery_type?: string
          description?: string | null
          different_first_charge?: boolean
          first_charge_price_cents?: number | null
          id?: string
          image_url?: string | null
          invoice_name?: string | null
          is_active?: boolean
          payment_type?: string
          price_cents?: number | null
          product_type?: string
          recurrence_frequency?: string | null
          recurrence_price_cents?: number | null
          refund_deadline_days?: number | null
          sac_display_name?: string | null
          sac_email?: string | null
          sales_page_url?: string | null
          show_in_showcase?: boolean
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number | null
          support_email?: string | null
          support_whatsapp?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_commissions: {
        Row: {
          amount_cents: number
          charge_id: string | null
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          amount_cents?: number
          charge_id?: string | null
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          amount_cents?: number
          charge_id?: string | null
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_commissions_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount_cents: number
          charge_id: string
          client_id: string
          created_at: string
          id: string
          reason: string | null
          status: Database["public"]["Enums"]["refund_status"]
        }
        Insert: {
          amount_cents: number
          charge_id: string
          client_id: string
          created_at?: string
          id?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
        }
        Update: {
          amount_cents?: number
          charge_id?: string
          client_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
        }
        Relationships: [
          {
            foreignKeyName: "refunds_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_connections: {
        Row: {
          access_token_encrypted: string
          created_at: string
          currency: string | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          scopes: string[]
          shop_domain: string
          shop_email: string | null
          shop_name: string | null
          status: string
          updated_at: string
          user_id: string
          webhook_token: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string
          currency?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          scopes?: string[]
          shop_domain: string
          shop_email?: string | null
          shop_name?: string | null
          status?: string
          updated_at?: string
          user_id: string
          webhook_token?: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string
          currency?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          scopes?: string[]
          shop_domain?: string
          shop_email?: string | null
          shop_name?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          webhook_token?: string
        }
        Relationships: []
      }
      shopify_products: {
        Row: {
          connection_id: string
          created_at: string
          currency: string | null
          description: string | null
          handle: string | null
          id: string
          image_url: string | null
          price_cents: number | null
          raw: Json
          shopify_product_id: number
          sku: string | null
          status: string | null
          synced_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          currency?: string | null
          description?: string | null
          handle?: string | null
          id?: string
          image_url?: string | null
          price_cents?: number | null
          raw?: Json
          shopify_product_id: number
          sku?: string | null
          status?: string | null
          synced_at?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          handle?: string | null
          id?: string
          image_url?: string | null
          price_cents?: number | null
          raw?: Json
          shopify_product_id?: number
          sku?: string | null
          status?: string | null
          synced_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_products_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "shopify_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          amount_cents: number
          charge_id: string | null
          created_at: string
          currency: string
          description: string
          due_date: string | null
          id: string
          invoice_url: string | null
          paid_at: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          charge_id?: string | null
          created_at?: string
          currency?: string
          description: string
          due_date?: string | null
          id?: string
          invoice_url?: string | null
          paid_at?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          charge_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          due_date?: string | null
          id?: string
          invoice_url?: string | null
          paid_at?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tracking_settings: {
        Row: {
          created_at: string
          ga_measurement_id: string | null
          google_ads_conversion_id: string | null
          google_ads_conversion_label: string | null
          id: string
          meta_access_token: string | null
          meta_pixel_id: string | null
          meta_test_event_code: string | null
          offer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ga_measurement_id?: string | null
          google_ads_conversion_id?: string | null
          google_ads_conversion_label?: string | null
          id?: string
          meta_access_token?: string | null
          meta_pixel_id?: string | null
          meta_test_event_code?: string | null
          offer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ga_measurement_id?: string | null
          google_ads_conversion_id?: string | null
          google_ads_conversion_label?: string | null
          id?: string
          meta_access_token?: string | null
          meta_pixel_id?: string | null
          meta_test_event_code?: string | null
          offer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_settings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: true
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_cents: number
          client_id: string
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        Insert: {
          amount_cents: number
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        Update: {
          amount_cents?: number
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: Database["public"]["Enums"]["tx_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      upsells: {
        Row: {
          created_at: string
          custom_price_cents: number | null
          description: string | null
          enabled: boolean
          id: string
          kind: string
          offer_id: string
          priority: number
          title: string | null
          trigger: string
          updated_at: string
          upsell_offer_id: string | null
        }
        Insert: {
          created_at?: string
          custom_price_cents?: number | null
          description?: string | null
          enabled?: boolean
          id?: string
          kind?: string
          offer_id: string
          priority?: number
          title?: string | null
          trigger?: string
          updated_at?: string
          upsell_offer_id?: string | null
        }
        Update: {
          created_at?: string
          custom_price_cents?: number | null
          description?: string | null
          enabled?: boolean
          id?: string
          kind?: string
          offer_id?: string
          priority?: number
          title?: string | null
          trigger?: string
          updated_at?: string
          upsell_offer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upsells_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: true
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsells_upsell_offer_id_fkey"
            columns: ["upsell_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          delivered_at: string | null
          endpoint_id: string
          event: string
          event_id: string | null
          id: string
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_code: number | null
          signature: string | null
          status: Database["public"]["Enums"]["webhook_delivery_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          endpoint_id: string
          event: string
          event_id?: string | null
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_code?: number | null
          signature?: string | null
          status?: Database["public"]["Enums"]["webhook_delivery_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          endpoint_id?: string
          event?: string
          event_id?: string | null
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_code?: number | null
          signature?: string | null
          status?: Database["public"]["Enums"]["webhook_delivery_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          events: string[]
          id: string
          secret_hash: string | null
          secret_prefix: string | null
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          events?: string[]
          id?: string
          secret_hash?: string | null
          secret_prefix?: string | null
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          events?: string[]
          id?: string
          secret_hash?: string | null
          secret_prefix?: string | null
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          notes: string | null
          pix_key: string
          pix_key_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          notes?: string | null
          pix_key: string
          pix_key_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          notes?: string | null
          pix_key?: string
          pix_key_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_user_id_by_email: { Args: { _email: string }; Returns: string }
      gen_offer_code: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_public_checkout_product: {
        Args: { _offer_code: string }
        Returns: {
          description: string
          id: string
          image_url: string
          sales_page_url: string
          support_email: string
          title: string
        }[]
      }
      get_public_tracking: {
        Args: { _offer_id: string }
        Returns: {
          ga_measurement_id: string
          meta_pixel_id: string
        }[]
      }
      get_referral_stats: {
        Args: { _user_id: string }
        Returns: {
          active_count: number
          inactive_count: number
          liberated_cents: number
          liberated_count: number
          pending_cents: number
          pending_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_offer_active: { Args: { _offer_id: string }; Returns: boolean }
      is_offer_owner: {
        Args: { _offer_id: string; _user_id: string }
        Returns: boolean
      }
      is_product_owner: {
        Args: { _product_id: string; _user_id: string }
        Returns: boolean
      }
      validate_coupon: {
        Args: {
          _code: string
          _offer_id?: string
          _owner_id: string
          _subtotal_cents?: number
        }
        Returns: {
          coupon_id: string
          discount_cents: number
          discount_type: Database["public"]["Enums"]["coupon_type"]
          discount_value: number
          reason: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      api_env: "sandbox" | "live"
      api_key_status: "active" | "revoked"
      app_role: "admin" | "user"
      audit_action:
        | "login"
        | "logout"
        | "config_update"
        | "api_key_create"
        | "api_key_revoke"
        | "charge_create"
        | "refund"
        | "withdrawal"
        | "fee_update"
        | "product_create"
        | "product_update"
        | "product_delete"
        | "offer_create"
        | "offer_update"
        | "offer_publish"
        | "offer_deactivate"
        | "offer_delete"
        | "checkout_update"
        | "tracking_update"
        | "order_bump_update"
        | "upsell_update"
        | "bank_account_create"
        | "bank_account_delete"
        | "bank_account_update"
        | "withdrawal_request"
        | "page_view"
        | "signup"
        | "signup_failed"
        | "login_failed"
        | "password_reset_request"
        | "medusa_webhook"
      charge_status:
        | "pending"
        | "paid"
        | "failed"
        | "canceled"
        | "refunded"
        | "chargeback"
      coupon_type: "percent" | "fixed"
      kyc_person_type: "pf" | "pj"
      kyc_status:
        | "pending"
        | "submitted"
        | "approved"
        | "rejected"
        | "changes_requested"
      link_status: "active" | "inactive" | "expired"
      offer_billing_type: "one_time" | "recurring"
      offer_status: "draft" | "active" | "inactive"
      payment_method: "pix" | "credit_card" | "boleto" | "debit_card"
      payout_status: "requested" | "processing" | "paid" | "failed"
      product_status: "active" | "inactive" | "archived"
      refund_status: "pending" | "succeeded" | "failed"
      tx_type: "charge" | "refund" | "payout" | "fee" | "adjustment"
      webhook_delivery_status: "pending" | "delivered" | "failed"
      withdrawal_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      api_env: ["sandbox", "live"],
      api_key_status: ["active", "revoked"],
      app_role: ["admin", "user"],
      audit_action: [
        "login",
        "logout",
        "config_update",
        "api_key_create",
        "api_key_revoke",
        "charge_create",
        "refund",
        "withdrawal",
        "fee_update",
        "product_create",
        "product_update",
        "product_delete",
        "offer_create",
        "offer_update",
        "offer_publish",
        "offer_deactivate",
        "offer_delete",
        "checkout_update",
        "tracking_update",
        "order_bump_update",
        "upsell_update",
        "bank_account_create",
        "bank_account_delete",
        "bank_account_update",
        "withdrawal_request",
        "page_view",
        "signup",
        "signup_failed",
        "login_failed",
        "password_reset_request",
        "medusa_webhook",
      ],
      charge_status: [
        "pending",
        "paid",
        "failed",
        "canceled",
        "refunded",
        "chargeback",
      ],
      coupon_type: ["percent", "fixed"],
      kyc_person_type: ["pf", "pj"],
      kyc_status: [
        "pending",
        "submitted",
        "approved",
        "rejected",
        "changes_requested",
      ],
      link_status: ["active", "inactive", "expired"],
      offer_billing_type: ["one_time", "recurring"],
      offer_status: ["draft", "active", "inactive"],
      payment_method: ["pix", "credit_card", "boleto", "debit_card"],
      payout_status: ["requested", "processing", "paid", "failed"],
      product_status: ["active", "inactive", "archived"],
      refund_status: ["pending", "succeeded", "failed"],
      tx_type: ["charge", "refund", "payout", "fee", "adjustment"],
      webhook_delivery_status: ["pending", "delivered", "failed"],
      withdrawal_status: ["pending", "approved", "rejected"],
    },
  },
} as const
