export type PricingConfig = {
  amount: string;
  currency: string;
};

export async function setPricing(config: PricingConfig): Promise<PricingConfig> {
  return config;
}
