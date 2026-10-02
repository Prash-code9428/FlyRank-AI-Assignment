import { z } from 'zod';

export const BookSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  product_url: z.string().url('product_url must be a valid URL').refine(
    (url) => url.startsWith('https://'),
    { message: 'product_url must start with https://' }
  ),
  price_gbp: z.number({ invalid_type_error: 'price_gbp must be a number' }).nonnegative('price_gbp must be non-negative'),
  price_text: z.string().min(1, 'price_text cannot be empty'),
  availability_text: z.string().min(1, 'availability_text cannot be empty'),
  rating_text: z.string().min(1, 'rating_text cannot be empty'),
  description: z.string().nullable().optional(),
  source_page: z.string().url('source_page must be a valid URL').refine(
    (url) => url.startsWith('https://'),
    { message: 'source_page must start with https://' }
  ),
  fetched_at: z.string().min(1, 'fetched_at must be recorded'),
});
