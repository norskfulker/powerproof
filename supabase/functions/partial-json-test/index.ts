import { parse, Allow } from "jsr:@promplate/partial-json";

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const results: Record<string, unknown> = {};

  const truncated1 = '{"title": "Orange Cart Renta';
  try {
    results.test1_truncated_string = parse(truncated1, Allow.OBJ | Allow.STR | Allow.ARR | Allow.NUM);
  } catch (e) {
    results.test1_truncated_string = { error: String(e) };
  }

  const truncated2 = '{"title": "Orange Cart Rental", "tagline": "Fresh juice on wheels", "full_desc": "This business tar';
  try {
    results.test2_mixed_complete_incomplete = parse(truncated2, Allow.OBJ | Allow.STR | Allow.ARR | Allow.NUM);
  } catch (e) {
    results.test2_mixed_complete_incomplete = { error: String(e) };
  }

  const truncated3 = '{"title": "Orange Cart Rental", "score_breakdown": {"profitability": 8, "ease": 6, "govt_supp';
  try {
    results.test3_nested_partial = parse(truncated3, Allow.OBJ | Allow.STR | Allow.ARR | Allow.NUM);
  } catch (e) {
    results.test3_nested_partial = { error: String(e) };
  }

  try {
    results.test4_empty = parse('{"tit', Allow.OBJ | Allow.STR | Allow.ARR | Allow.NUM);
  } catch (e) {
    results.test4_empty = { error: String(e) };
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
