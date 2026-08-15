-- Public slug list for sitemap generation (anon-safe, no row-level PII).
create or replace function public.get_opportunity_sitemap_slugs()
returns table (
  slug text,
  lastmod date
)
language sql
security definer
set search_path = public
stable
as $$
  select
    o.slug,
    coalesce(o.updated_at, o.published_at)::date as lastmod
  from public.opportunities o
  where o.status = 'live'
    and o.slug is not null
    and o.slug <> 'ancggh'
    and coalesce(o.seo_noindex, false) = false
  order by o.slug;
$$;

revoke all on function public.get_opportunity_sitemap_slugs() from public;
grant execute on function public.get_opportunity_sitemap_slugs() to anon, authenticated;
