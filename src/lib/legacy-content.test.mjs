import assert from "node:assert/strict";
import test from "node:test";
import { getNews, getPublications, renderLiquid } from "./legacy-content.ts";

test("removes captured Liquid values without emitting them", () => {
  const rendered = renderLiquid(`
    {% capture ARCHIVE %}release-{{ GECODESTAMP }}.tar.gz{% endcapture %}
    <p>Gecode {{ GECODESTAMP }}</p>
  `);
  assert.equal(rendered, "<p>Gecode 6.4.0</p>");
});

test("normalizes archived content into semantic values", async () => {
  const news = await getNews();
  const publications = await getPublications();
  assert.equal(news.length, 45);
  assert.equal(publications.length, 11);
  assert.equal(news.find((item) => item.slug === "models-by-h--229-kan-kjellerstrand")?.title, "Models by Håkan Kjellerstrand");
  assert.match(publications[0].publishedDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(publications.every((publication) => publication.description.length > 0));
});
