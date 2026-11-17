# 0019: The country list: who is in it, and names follow CLDR

- **Status:** accepted
- **Date:** 2026-11-16
- **Risk:** **high** for the scope decision. Thor wants it revisited (see "When to revisit").
- **Supersedes:** the scope and the name examples in `docs/specs/mvp.md` §1 as first written (195 countries, Kosovo and Taiwan commented out, "DR Congo")

## Context
The MVP spec set the scope at the 193 UN members plus the UN's two observer states, Palestine and the Vatican: 195 countries. Kosovo and Taiwan were to be commented-out rows, easy to switch on. The spec gave no reason for leaving them out beyond that rule.

The spec also asked for "common English short names" without naming a source, which left every debatable name (Turkey or Türkiye, Cape Verde or Cabo Verde) as an agent's judgement call.

## Thor's standing rule (2026-11-17)
Questions of recognition, contested territory and international relations must not hold the work up.
- **Prefer inclusion over exclusion.**
- **Record every such decision here, or in ADR 0020 for the map, as high risk.**
- **Don't stop to ask Thor about each one.** He revisits them all when the MVP is done.

## Decision
- **Kosovo (XK) and Taiwan (TW) are in the list:** 197 countries. Thor decided this on 2026-11-16, and asked for it to be recorded as a high-risk decision.
- **Western Sahara (EH) is in the list too:** 198 countries. Thor decided this on 2026-11-17, on seeing it on the map as land that couldn't be opened.
  - It has an official ISO code (`EH`), and CLDR's name for it is "Western Sahara".
  - Its region is North Africa. The African Union, whose regions we use for Africa, counts it (as the Sahrawi Arab Democratic Republic) among its members.
  - Its facts come from Wikidata's entry for the Sahrawi Arab Democratic Republic, pinned in the overrides file and **waiting for Thor's review**: two capitals (Laayoune, which the republic claims and Morocco controls, and Tifariti, its temporary capital), Arabic and Spanish, "republic". Its borders with Morocco, Algeria and Mauritania are added by hand on both sides.
  - On the map it is its own shape, in one piece: the part Morocco holds is moved from Morocco to it, along Natural Earth's line near the parallel 27°40′ N (ADR 0020).
- **The Cook Islands (CK) and Niue (NU) are in the list too:** 200 countries. Added by the agent on 2026-11-17 under the standing rule above. Both are self-governing states in free association with New Zealand: not UN members, not disputed, with ISO codes, CLDR names and diplomatic relations of their own. Their region is Polynesia, as in UN M49. Wikidata has no form of government for either; "constitutional monarchy" is filled in by hand.
- **Kosovo and Taiwan get regions by convention,** because UN M49 lists neither: Kosovo in Southern Europe, Taiwan in Eastern Asia.
- **Names are Unicode CLDR's English names,** copied as they are, including "Türkiye", "Congo - Kinshasa", "Congo - Brazzaville" and "&" in names like "Bosnia & Herzegovina". CLDR is the list browsers and operating systems use. Where the spec and CLDR differ and the spec gives no reason, CLDR wins.
- **Two names use CLDR's short form:** "Palestine" (the standard form is "Palestinian Territories", which doesn't fit a list of countries) and "Myanmar" (the standard form is "Myanmar (Burma)").
- **The names are copied once into `countries.ts`,** with the CLDR version in a comment. They are not read from `Intl.DisplayNames` at run time: a runtime upgrade could then rename a country without review.

## Alternatives considered
- **Keep the spec's 195, with the two commented out:** a clear rule (UN members and observers) that needs no judgement, but it leaves out two places that people travel to and learn about as countries.
- **Add other partly recognised states too:** no obvious place to stop. Kosovo and Taiwan were the two the spec already named; Western Sahara was added later. The others that could be argued for, none of which is in the list (see "Others looked at" below).
- **UN and ISO official names:** an agreed standard, but formal ("Russian Federation", "Democratic People's Republic of Korea", "Lao People's Democratic Republic"). They don't fit a 12 px map label.
- **Names chosen by hand:** what the spec implied. Every debatable name becomes a decision somebody has to defend.

## Consequences
- **Western Sahara is disputed too.** Morocco controls most of it and regards it as Moroccan; listing it as a country, and drawing it apart from Morocco, can draw complaints and can get an app restricted in Morocco.
- **Kosovo and Taiwan are disputed, which is why the risk is high.** China regards Taiwan as part of China, and Serbia and about half the UN's members don't recognise Kosovo. Listing them as countries can draw complaints, and showing Taiwan as a country can get an app restricted in some markets.
- **Other data sources don't treat them as ordinary countries:**
  - `XK` is a user-assigned code, not an official ISO 3166 code. Natural Earth has Kosovo's shape, and gives it `XK` in a field of its own (`ISO_A2_EH`), which the map script uses (ADR 0020).
  - Wikidata's facts for both (independence date, capital, neighbours) are contested, so they are likely to need entries in the overrides file (M1 PR 2).
  - Map borders: Kosovo is drawn as its own shape, separate from Serbia.
- **The totals change everywhere:** 200 in total, 55 in Africa, 45 in Europe, 49 in Asia, 16 in Oceania. Progress reads "12 / 200".
- **Taking them out gets harder with time.** Today it means deleting two rows and changing the counts in the tests. Once users have published essays about either (from M4), removing a country also means deciding what happens to those essays.
- **CLDR names change now and then** ("Turkey" became "Türkiye"). We pick up a change only when somebody updates `countries.ts` on purpose.

## Others looked at (2026-11-17)
Thor asked which other places have the same status as Western Sahara. None is quite alike: Western Sahara has an official ISO code, membership of the African Union, and recognition by dozens of UN members. **The facts below are from the agent's general knowledge and should be checked before any of them is acted on.**

| Place | Status | On the map today (ADR 0020) |
|---|---|---|
| **Northern Cyprus** | Declared independence in 1983; recognised only by Türkiye | Neutral land |
| **Abkhazia, South Ossetia** | Declared independence from Georgia; recognised by Russia and a few other UN members | Part of Georgia |
| **Somaliland** | Declared independence from Somalia in 1991; little or no recognition by UN members | Part of Somalia |
| **Transnistria** | Declared independence from Moldova; recognised by no UN member | Part of Moldova |
| **Cook Islands, Niue** | Self-governing states in free association with New Zealand; not UN members, not disputed, with ISO codes and diplomatic relations of their own | Countries in the list since, each with its own shape |

**The Cook Islands and Niue have since been added** (see "Decision"). The other five have not, and under the standing rule they would be: what stops it today is that our sources have no ISO code or CLDR name for them, and no shape for three of them. Natural Earth's disputed-areas layer does have shapes for all five (found 2026-11-17), so this is to be looked at again when the map data is rebuilt on Natural Earth's own files (`docs/specs/m1.md`).

## When to revisit
Thor hasn't set a date. The scope decision should be looked at again:
- before sign-up opens to people who aren't invited;
- before the first user can publish an essay about either country (M4), since that is when reversing it starts to cost something;
- if a complaint, a legal question or a restriction in some market comes up.
