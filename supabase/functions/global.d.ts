declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

declare module "https://esm.sh/tweetnacl@1.0.3" {
  const nacl: {
    sign: {
      detached: {
        verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean;
      };
    };
  };

  export default nacl;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(
    url: string,
    key: string,
    options?: {
      auth?: {
        persistSession?: boolean;
        autoRefreshToken?: boolean;
      };
    },
  ): any;
}