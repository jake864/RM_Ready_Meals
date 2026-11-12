export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          name: string;
          phone: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          name: string;
          phone: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          name?: string;
          phone?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      deliveries: {
        Row: {
          collected_at: string | null;
          dispatched_at: string | null;
          id: string;
          notes: string | null;
          order_id: string;
        };
        Insert: {
          collected_at?: string | null;
          dispatched_at?: string | null;
          id?: string;
          notes?: string | null;
          order_id: string;
        };
        Update: {
          collected_at?: string | null;
          dispatched_at?: string | null;
          id?: string;
          notes?: string | null;
          order_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deliveries_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_ingredients: {
        Row: {
          allergen: string | null;
          id: string;
          meal_id: string;
          name: string;
        };
        Insert: {
          allergen?: string | null;
          id?: string;
          meal_id: string;
          name: string;
        };
        Update: {
          allergen?: string | null;
          id?: string;
          meal_id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meal_ingredients_meal_id_fkey";
            columns: ["meal_id"];
            isOneToOne: false;
            referencedRelation: "meals";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_nutrition: {
        Row: {
          meal_id: string;
          values_json: Json;
          verified: boolean;
          verified_at: string | null;
        };
        Insert: {
          meal_id: string;
          values_json?: Json;
          verified?: boolean;
          verified_at?: string | null;
        };
        Update: {
          meal_id?: string;
          values_json?: Json;
          verified?: boolean;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meal_nutrition_meal_id_fkey";
            columns: ["meal_id"];
            isOneToOne: true;
            referencedRelation: "meals";
            referencedColumns: ["id"];
          },
        ];
      };
      meals: {
        Row: {
          active: boolean;
          allergens: string;
          description: string;
          id: string;
          image: string;
          ingredients: string;
          name: string;
          sort_order: number;
          subtitle: string;
          tag: string;
        };
        Insert: {
          active?: boolean;
          allergens: string;
          description: string;
          id: string;
          image: string;
          ingredients: string;
          name: string;
          sort_order?: number;
          subtitle: string;
          tag: string;
        };
        Update: {
          active?: boolean;
          allergens?: string;
          description?: string;
          id?: string;
          image?: string;
          ingredients?: string;
          name?: string;
          sort_order?: number;
          subtitle?: string;
          tag?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          meal_id: string;
          order_id: string;
          quantity: number;
        };
        Insert: {
          id?: string;
          meal_id: string;
          order_id: string;
          quantity: number;
        };
        Update: {
          id?: string;
          meal_id?: string;
          order_id?: string;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_meal_id_fkey";
            columns: ["meal_id"];
            isOneToOne: false;
            referencedRelation: "meals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          batch_id: string;
          created_at: string;
          customer_email: string;
          customer_id: string | null;
          customer_name: string;
          customer_phone: string;
          customer_record_id: string;
          fingerprint: string;
          id: string;
          idempotency_key: string;
          pack_size: number;
          reserved_until: string;
          status: string;
          stripe_session_id: string | null;
          total_cents: number;
        };
        Insert: {
          batch_id: string;
          created_at?: string;
          customer_email: string;
          customer_id?: string | null;
          customer_name: string;
          customer_phone: string;
          customer_record_id: string;
          fingerprint: string;
          id?: string;
          idempotency_key: string;
          pack_size: number;
          reserved_until?: string;
          status?: string;
          stripe_session_id?: string | null;
          total_cents: number;
        };
        Update: {
          batch_id?: string;
          created_at?: string;
          customer_email?: string;
          customer_id?: string | null;
          customer_name?: string;
          customer_phone?: string;
          customer_record_id?: string;
          fingerprint?: string;
          id?: string;
          idempotency_key?: string;
          pack_size?: number;
          reserved_until?: string;
          status?: string;
          stripe_session_id?: string | null;
          total_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "orders_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "production_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_customer_record_id_fkey";
            columns: ["customer_record_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_pack_size_fkey";
            columns: ["pack_size"];
            isOneToOne: false;
            referencedRelation: "pack_configurations";
            referencedColumns: ["size"];
          },
        ];
      };
      pack_configurations: {
        Row: {
          label: string;
          note: string;
          price: number;
          size: number;
        };
        Insert: {
          label: string;
          note: string;
          price: number;
          size: number;
        };
        Update: {
          label?: string;
          note?: string;
          price?: number;
          size?: number;
        };
        Relationships: [];
      };
      payment_events: {
        Row: {
          created_at: string;
          event_id: string;
          order_id: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          order_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          order_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_cents: number;
          created_at: string;
          currency: string;
          id: string;
          order_id: string;
          stripe_intent: string | null;
          stripe_session: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          currency: string;
          id?: string;
          order_id: string;
          stripe_intent?: string | null;
          stripe_session: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          order_id?: string;
          stripe_intent?: string | null;
          stripe_session?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      pickup_locations: {
        Row: {
          active: boolean;
          address: string | null;
          id: string;
          name: string;
        };
        Insert: {
          active?: boolean;
          address?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          active?: boolean;
          address?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      print_jobs: {
        Row: {
          attempts: number;
          batch_id: string;
          created_at: string;
          document_key: string;
          id: string;
          last_error: string | null;
          order_id: string | null;
          provider: string;
          status: string;
        };
        Insert: {
          attempts?: number;
          batch_id: string;
          created_at?: string;
          document_key: string;
          id?: string;
          last_error?: string | null;
          order_id?: string | null;
          provider?: string;
          status?: string;
        };
        Update: {
          attempts?: number;
          batch_id?: string;
          created_at?: string;
          document_key?: string;
          id?: string;
          last_error?: string | null;
          order_id?: string | null;
          provider?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "print_jobs_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "production_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "print_jobs_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      production_batches: {
        Row: {
          capacity: number;
          cutoff_at: string;
          id: string;
          meal_caps: Json;
          pickup_at: string;
          pickup_location_id: string | null;
          production_date: string;
          suspended: boolean;
        };
        Insert: {
          capacity?: number;
          cutoff_at: string;
          id?: string;
          meal_caps?: Json;
          pickup_at: string;
          pickup_location_id?: string | null;
          production_date: string;
          suspended?: boolean;
        };
        Update: {
          capacity?: number;
          cutoff_at?: string;
          id?: string;
          meal_caps?: Json;
          pickup_at?: string;
          pickup_location_id?: string | null;
          production_date?: string;
          suspended?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "production_batches_pickup_location_id_fkey";
            columns: ["pickup_location_id"];
            isOneToOne: false;
            referencedRelation: "pickup_locations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      confirm_payment: {
        Args: {
          p_amount: number;
          p_currency: string;
          p_event: string;
          p_intent: string;
          p_order: string;
          p_session: string;
        };
        Returns: undefined;
      };
      reserve_order: {
        Args: {
          p_batch: string;
          p_email: string;
          p_fingerprint: string;
          p_items: Json;
          p_key: string;
          p_name: string;
          p_phone: string;
          p_size: number;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
