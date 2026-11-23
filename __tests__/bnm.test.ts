import { fetchRateTable, FetchFn, NoDataError, parseBnmXml, perUnit, UnavailableError } from '../src/lib/bnm';

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<ValCurs Date="20.11.2026" name="Official exchange rate">
  <Valute ID="47"><NumCode>978</NumCode><CharCode>EUR</CharCode><Nominal>1</Nominal><Name>Euro</Name><Value>20.1267</Value></Valute>
  <Valute ID="44"><NumCode>840</NumCode><CharCode>USD</CharCode><Nominal>1</Nominal><Name>US Dollar</Name><Value>18,3070</Value></Valute>
  <Valute ID="1"><CharCode>JPY</CharCode><Nominal>100</Nominal><Name>Yen</Name><Value>11.80</Value></Valute>
  <Valute ID="2"><CharCode>BAD</CharCode><Nominal>1</Nominal><Value>abc</Value></Valute>
  <Valute ID="3"><CharCode>ZER</CharCode><Nominal>0</Nominal><Value>1</Value></Valute>
</ValCurs>`;

describe('parseBnmXml', () => {
  it('parses valid items, comma decimals and nominal', () => {
    const t = parseBnmXml(XML, '20.11.2026');
    expect(t.date).toBe('20.11.2026');
    expect(Object.keys(t.rates).sort()).toEqual(['EUR', 'JPY', 'MDL', 'USD']);
    expect(t.rates.USD.value).toBeCloseTo(18.307);
    expect(perUnit(t.rates.JPY)).toBeCloseTo(0.118);
    expect(t.rates.MDL.value).toBe(1);
  });

  it('handles a single <Valute> (not an array in XML)', () => {
    const t = parseBnmXml(
      '<ValCurs Date="01.01.2026"><Valute><CharCode>EUR</CharCode><Nominal>1</Nominal><Value>19.7</Value></Valute></ValCurs>',
      'x',
    );
    expect(t.rates.EUR.value).toBe(19.7);
  });

  it('uses the requested date when the attribute is missing', () => {
    const t = parseBnmXml('<ValCurs><Valute><CharCode>EUR</CharCode><Nominal>1</Nominal><Value>20</Value></Valute></ValCurs>', '05.05.2026');
    expect(t.date).toBe('05.05.2026');
  });

  it.each([
    ['empty body', ''],
    ['whitespace', '  \n '],
    ['empty ValCurs', '<ValCurs Date="21.11.2026"></ValCurs>'],
    ['only invalid items', '<ValCurs><Valute><CharCode>X</CharCode></Valute></ValCurs>'],
  ])('throws NoDataError for %s', (_, body) => {
    expect(() => parseBnmXml(body, 'd')).toThrow(NoDataError);
  });

  it.each([
    ['plain text', 'Service temporarily unavailable'],
    ['other root', '<root><x/></root>'],
  ])('throws UnavailableError for %s', (_, body) => {
    expect(() => parseBnmXml(body, 'd')).toThrow(UnavailableError);
  });
});

const respond = (status: number, body = ''): FetchFn => async () => ({ status, text: async () => body });

describe('fetchRateTable', () => {
  const day = new Date(2026, 10, 20);

  it('builds the BNM URL and parses the body', async () => {
    let url = '';
    const t = await fetchRateTable(day, async (u) => {
      url = u;
      return { status: 200, text: async () => XML };
    });
    expect(url).toBe('https://www.bnm.md/en/official_exchange_rates?get_xml=1&date=20.11.2026');
    expect(t.rates.EUR.value).toBe(20.1267);
  });

  it('404 → NoDataError', async () => {
    await expect(fetchRateTable(day, respond(404))).rejects.toBeInstanceOf(NoDataError);
  });

  it('500 → UnavailableError', async () => {
    await expect(fetchRateTable(day, respond(500))).rejects.toBeInstanceOf(UnavailableError);
  });

  it('network failure → UnavailableError', async () => {
    await expect(
      fetchRateTable(day, async () => {
        throw new TypeError('Network request failed');
      }),
    ).rejects.toBeInstanceOf(UnavailableError);
  });
});
