import assert from "node:assert/strict";
import { test } from "node:test";
import {
  INT16_MAX,
  INT16_MIN,
  PRESETS,
  UINT16_MAX,
  bitValue,
  explainTwosComplement,
  formatBinary,
  formatWeightedSum,
  hexDigits,
  parseHexInput,
  parseSignedInput,
  parseUnsignedInput,
  rawToSlider,
  signedWeight,
  sliderRange,
  toHex,
  toSigned,
  toUnsigned,
  toggleBit,
  unsignedWeight,
} from "../js/register.js";

const EDGE_CASES = [
  { raw: 0x0000, signed: 0, unsigned: 0, hex: "0x0000" },
  { raw: 0x0001, signed: 1, unsigned: 1, hex: "0x0001" },
  { raw: 0x7fff, signed: 32767, unsigned: 32767, hex: "0x7FFF" },
  { raw: 0x8000, signed: -32768, unsigned: 32768, hex: "0x8000" },
  { raw: 0x8001, signed: -32767, unsigned: 32769, hex: "0x8001" },
  { raw: 0xffff, signed: -1, unsigned: 65535, hex: "0xFFFF" },
  { raw: 0xff9c, signed: -100, unsigned: 65436, hex: "0xFF9C" },
  { raw: 0xaaaa, signed: -21846, unsigned: 43690, hex: "0xAAAA" },
];

test("derives the specification edge cases from one pattern", () => {
  for (const sample of EDGE_CASES) {
    assert.equal(toSigned(sample.raw), sample.signed);
    assert.equal(toUnsigned(sample.raw), sample.unsigned);
    assert.equal(toHex(sample.raw), sample.hex);
    assert.equal(formatBinary(sample.raw).replaceAll(" ", ""), sample.raw.toString(2).padStart(16, "0"));
  }
});

test("edits in every representation resolve to the same pattern", () => {
  for (const sample of EDGE_CASES) {
    assert.deepEqual(parseSignedInput(String(sample.signed)), { ok: true, raw: sample.raw });
    assert.deepEqual(parseUnsignedInput(String(sample.unsigned)), { ok: true, raw: sample.raw });
    assert.deepEqual(parseHexInput(sample.hex), { ok: true, raw: sample.raw });
    assert.deepEqual(parseHexInput(sample.hex.slice(2)), { ok: true, raw: sample.raw });
    assert.deepEqual(parseHexInput(sample.hex.toLowerCase()), { ok: true, raw: sample.raw });
  }
});

test("every 16-bit pattern round-trips through signed, unsigned, and hex", () => {
  for (let raw = 0; raw <= 0xffff; raw += 1) {
    assert.equal(toUnsigned(raw), raw);
    assert.equal(toSigned(raw), raw >= 0x8000 ? raw - 0x10000 : raw);
    assert.deepEqual(parseSignedInput(String(toSigned(raw))), { ok: true, raw });
    assert.deepEqual(parseUnsignedInput(String(toUnsigned(raw))), { ok: true, raw });
    assert.deepEqual(parseHexInput(toHex(raw)), { ok: true, raw });
  }
});

test("bit toggles change only the selected bit", () => {
  let raw = 0;
  for (let bit = 0; bit < 16; bit += 1) {
    raw = toggleBit(raw, bit);
    assert.equal(bitValue(raw, bit), 1);
    for (let other = 0; other < bit; other += 1) {
      assert.equal(bitValue(raw, other), 1);
    }
  }
  assert.equal(raw, 0xffff);
  raw = toggleBit(raw, 15);
  assert.equal(raw, 0x7fff);
  assert.throws(() => toggleBit(raw, 16), RangeError);
  assert.throws(() => toggleBit(raw, -1), RangeError);
});

test("slider modes reinterpret the same pattern", () => {
  assert.deepEqual(sliderRange("signed"), { min: INT16_MIN, max: INT16_MAX });
  assert.deepEqual(sliderRange("unsigned"), { min: 0, max: UINT16_MAX });
  for (const sample of EDGE_CASES) {
    assert.equal(rawToSlider(sample.raw, "signed"), sample.signed);
    assert.equal(rawToSlider(sample.raw, "unsigned"), sample.unsigned);
    assert.equal(parseSignedInput(String(rawToSlider(sample.raw, "signed"))).raw, sample.raw);
    assert.equal(parseUnsignedInput(String(rawToSlider(sample.raw, "unsigned"))).raw, sample.raw);
  }
});

test("presets use the documented patterns", () => {
  const rawByLabel = Object.fromEntries(PRESETS.map((preset) => [preset.label, preset.raw]));
  assert.equal(rawByLabel.Zero, 0x0000);
  assert.equal(rawByLabel.One, 0x0001);
  assert.equal(rawByLabel["Maximum Signed"], 0x7fff);
  assert.equal(rawByLabel["Minimum Signed"], 0x8000);
  assert.equal(rawByLabel["Maximum Unsigned"], 0xffff);
  assert.equal(rawByLabel["Alternating Bits"], 0xaaaa);
  assert.equal(rawByLabel["All Bits OFF"], 0x0000);
  assert.equal(rawByLabel["All Bits ON"], 0xffff);
});

test("rejects out-of-range values instead of wrapping", () => {
  assert.equal(parseSignedInput("32768").ok, false);
  assert.equal(parseSignedInput("32768").reason, "invalid");
  assert.equal(parseSignedInput("-32769").reason, "invalid");
  assert.equal(parseUnsignedInput("65536").reason, "invalid");
  assert.equal(parseUnsignedInput("-1").reason, "invalid");
  assert.equal(parseHexInput("0x10000").reason, "invalid");
  assert.equal(parseHexInput("10000").reason, "invalid");
  assert.equal(parseSignedInput("32768").raw, undefined);
  assert.equal(parseUnsignedInput("65536").raw, undefined);
});

test("accepts prefixes, leading zeros, and incomplete edits", () => {
  assert.deepEqual(parseSignedInput("00010"), { ok: true, raw: 10 });
  assert.deepEqual(parseSignedInput("+15"), { ok: true, raw: 15 });
  assert.deepEqual(parseSignedInput("  -100 "), { ok: true, raw: 0xff9c });
  assert.deepEqual(parseUnsignedInput("0001"), { ok: true, raw: 1 });
  assert.deepEqual(parseHexInput("0x00ff"), { ok: true, raw: 0x00ff });
  assert.deepEqual(parseHexInput("00FF"), { ok: true, raw: 0x00ff });
  assert.equal(parseSignedInput("").reason, "incomplete");
  assert.equal(parseSignedInput("-").reason, "incomplete");
  assert.equal(parseUnsignedInput("").reason, "incomplete");
  assert.equal(parseHexInput("").reason, "incomplete");
  assert.equal(parseHexInput("0x").reason, "incomplete");
  assert.equal(parseHexInput("0X").reason, "incomplete");
  assert.equal(parseSignedInput("12.5").reason, "invalid");
  assert.equal(parseSignedInput("1e2").reason, "invalid");
  assert.equal(parseHexInput("0x0G").reason, "invalid");
  assert.equal(parseUnsignedInput("-0").message, "Unsigned values cannot be negative.");
});

test("bit 15 weight changes with interpretation", () => {
  assert.equal(unsignedWeight(0), 1);
  assert.equal(unsignedWeight(1), 2);
  assert.equal(unsignedWeight(15), 32768);
  assert.equal(signedWeight(0), 1);
  assert.equal(signedWeight(14), 16384);
  assert.equal(signedWeight(15), -32768);
  assert.equal(formatWeightedSum(0x8001, "unsigned"), "32768 + 1 = 32769");
  assert.equal(formatWeightedSum(0x8001, "signed"), "(-32768) + 1 = -32767");
  assert.equal(formatWeightedSum(0, "signed"), "0 = 0");
});

test("groups nibbles into hexadecimal digits", () => {
  assert.equal(formatBinary(0xac3f), "1010 1100 0011 1111");
  assert.deepEqual(hexDigits(0xac3f), ["A", "C", "3", "F"]);
  assert.deepEqual(hexDigits(0x8001), ["8", "0", "0", "1"]);
});

test("explains two's complement for ordinary negatives and for -32768", () => {
  const minusOne = explainTwosComplement(0xffff);
  assert.equal(
    minusOne.summary,
    "-1 is encoded as the two's complement of 1. The bits store that transformed magnitude, not a separate minus sign.",
  );
  assert.deepEqual(
    minusOne.steps.map((step) => step.binary),
    [
      "0000 0000 0000 0001",
      "1111 1111 1111 1110",
      "1111 1111 1111 1111",
      "1111 1111 1111 1111",
    ],
  );

  const minus100 = explainTwosComplement(0xff9c);
  assert.deepEqual(
    minus100.steps.map((step) => step.binary),
    [
      "0000 0000 0110 0100",
      "1111 1111 1001 1011",
      "1111 1111 1001 1100",
      "1111 1111 1001 1100",
    ],
  );

  const minimum = explainTwosComplement(0x8000);
  assert.match(minimum.summary, /cannot store \+32768/);
  assert.deepEqual(
    minimum.steps.map((step) => step.binary),
    [
      "1000 0000 0000 0000",
      "0111 1111 1111 1111",
      "1000 0000 0000 0000",
      "1000 0000 0000 0000",
    ],
  );

  assert.equal(explainTwosComplement(0), null);
  assert.equal(explainTwosComplement(0x7fff), null);
});

test("two's complement steps reproduce every negative pattern", () => {
  for (let raw = 0; raw <= 0x7fff; raw += 1) {
    assert.equal(explainTwosComplement(raw), null);
  }
  for (let raw = 0x8000; raw <= 0xffff; raw += 1) {
    const explanation = explainTwosComplement(raw);
    assert.equal(explanation.steps.at(-1).binary, formatBinary(raw));
  }
});
