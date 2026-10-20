import {
  PRESETS,
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
} from "./register.js";

const NIBBLE_RANGES = ["15-12", "11-8", "7-4", "3-0"];

class RegisterApp {
  constructor(root) {
    this.root = root;
    this.raw = 0;
    this.sliderMode = "signed";
    this.syncingSlider = false;
    this.bits = [];
    this.digits = [];
    this.presets = [];
    this.inputs = {
      signed: root.querySelector("#input-signed"),
      unsigned: root.querySelector("#input-unsigned"),
      hex: root.querySelector("#input-hex"),
    };
    this.messages = {
      signed: root.querySelector("#message-signed"),
      unsigned: root.querySelector("#message-unsigned"),
      hex: root.querySelector("#message-hex"),
    };
    this.registerName = root.querySelector("#register-name");
    this.registerHeading = root.querySelector("#register-heading");
    this.binaryReadout = root.querySelector("#binary-readout");
    this.signNote = root.querySelector("#sign-note");
    this.weightsToggle = root.querySelector("#show-weights");
    this.weightsReadout = root.querySelector("#weights-readout");
    this.sumUnsigned = root.querySelector("#sum-unsigned");
    this.sumSigned = root.querySelector("#sum-signed");
    this.signedCard = root.querySelector("#signed-card");
    this.slider = root.querySelector("#slider");
    this.sliderReadout = root.querySelector("#slider-readout");
    this.sliderMin = root.querySelector("#slider-min");
    this.sliderMax = root.querySelector("#slider-max");
    this.modeButtons = [...root.querySelectorAll(".segment button")];
    this.twos = root.querySelector("#twos");
    this.twosSummary = root.querySelector("#twos-summary");
    this.twosSteps = root.querySelector("#twos-steps");
    this.buildBits();
    this.buildSteps();
    this.buildPresets();
    this.bind();
    this.render();
  }

  buildBits() {
    const row = this.root.querySelector("#bit-row");
    for (let nibble = 0; nibble < 4; nibble += 1) {
      const group = document.createElement("div");
      group.className = "nibble";
      const bits = document.createElement("div");
      bits.className = "nibble-bits";
      for (let offset = 0; offset < 4; offset += 1) {
        const bitIndex = 15 - (nibble * 4 + offset);
        bits.append(this.createBit(bitIndex));
      }
      const hex = document.createElement("div");
      hex.className = "nibble-hex";
      const digit = document.createElement("span");
      digit.className = "nibble-digit";
      const caption = document.createElement("span");
      caption.className = "nibble-caption";
      caption.textContent = `bits ${NIBBLE_RANGES[nibble]}`;
      hex.append(digit, caption);
      group.append(bits, hex);
      row.append(group);
      this.digits.push(digit);
    }
  }

  createBit(bitIndex) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = bitIndex === 15 ? "bit sign" : "bit";
    button.dataset.bit = String(bitIndex);
    const index = document.createElement("span");
    index.className = "bit-index";
    index.textContent = String(bitIndex);
    const sign = document.createElement("em");
    sign.className = "sign-tag";
    sign.textContent = bitIndex === 15 ? "SIGN" : "";
    const value = document.createElement("span");
    value.className = "bit-value";
    const role = document.createElement("span");
    role.className = "bit-role";
    role.textContent = bitIndex === 15 ? "MSB" : bitIndex === 0 ? "LSB" : "";
    const weight = document.createElement("span");
    weight.className = "bit-weight";
    button.append(index, sign, value, role, weight);
    for (const child of button.children) child.setAttribute("aria-hidden", "true");
    button.addEventListener("click", () => this.setRaw(toggleBit(this.raw, bitIndex)));
    button.addEventListener("keydown", (event) => this.moveBitFocus(event, bitIndex));
    this.bits[bitIndex] = { button, value, weight };
    return button;
  }

  moveBitFocus(event, bitIndex) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = bitIndex + (event.key === "ArrowLeft" ? 1 : -1);
    if (next >= 0 && next <= 15) this.bits[next].button.focus();
  }

  buildSteps() {
    for (let index = 0; index < 4; index += 1) {
      const item = document.createElement("li");
      item.className = "twos-step";
      const title = document.createElement("strong");
      const binary = document.createElement("code");
      binary.className = "twos-binary";
      const note = document.createElement("span");
      item.append(title, binary, note);
      this.twosSteps.append(item);
    }
  }

  buildPresets() {
    const row = this.root.querySelector("#presets");
    for (const preset of PRESETS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "preset";
      button.textContent = preset.label;
      button.addEventListener("click", () => this.setRaw(preset.raw));
      row.append(button);
      this.presets.push({ button, raw: preset.raw });
    }
  }

  bind() {
    this.registerName.addEventListener("input", () => this.renderRegisterName());
    this.weightsToggle.addEventListener("change", () => {
      this.root.classList.toggle("show-weights", this.weightsToggle.checked);
      this.weightsReadout.hidden = !this.weightsToggle.checked;
    });
    this.bindValueInput("signed", parseSignedInput, () => String(toSigned(this.raw)));
    this.bindValueInput("unsigned", parseUnsignedInput, () => String(toUnsigned(this.raw)));
    this.bindValueInput("hex", parseHexInput, () => toHex(this.raw));
    this.slider.addEventListener("input", () => {
      if (this.syncingSlider) return;
      const parse = this.sliderMode === "signed" ? parseSignedInput : parseUnsignedInput;
      const result = parse(this.slider.value);
      if (result.ok) this.setRaw(result.raw);
    });
    for (const button of this.modeButtons) {
      button.addEventListener("click", () => this.setSliderMode(button.dataset.mode));
    }
    this.root.querySelector("#reset").addEventListener("click", () => this.setRaw(0));
    this.root.addEventListener("pointerdown", (event) => this.canonicalizeActiveField(event));
  }

  canonicalizeActiveField(event) {
    const active = document.activeElement;
    if (!(active instanceof HTMLInputElement)) return;
    const name = this.fieldName(active);
    if (!name) return;
    if (event.target instanceof Node && (event.target === active || active.contains(event.target))) return;
    active.value = this.canonicalValue(name);
    this.clearField(name);
  }

  fieldName(input) {
    return Object.keys(this.inputs).find((name) => this.inputs[name] === input) ?? null;
  }

  canonicalValue(name) {
    if (name === "signed") return String(toSigned(this.raw));
    if (name === "unsigned") return String(toUnsigned(this.raw));
    return toHex(this.raw);
  }

  bindValueInput(name, parse, canonical) {
    const input = this.inputs[name];
    input.addEventListener("pointerdown", () => {
      if (document.activeElement !== input) input.dataset.selectOnFocus = "yes";
    });
    input.addEventListener("focus", () => {
      if (input.dataset.selectOnFocus !== "no") input.select();
      delete input.dataset.selectOnFocus;
    });
    input.addEventListener("input", () => {
      const result = parse(input.value);
      this.showParse(name, result);
      if (result.ok) this.setRaw(result.raw, name);
    });
    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (document.activeElement === input) return;
        input.value = canonical();
        this.clearField(name);
      }, 0);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") input.blur();
      if (event.key === "Escape") {
        input.value = canonical();
        this.clearField(name);
        input.blur();
      }
    });
  }

  setSliderMode(mode) {
    if (mode !== "signed" && mode !== "unsigned") return;
    this.sliderMode = mode;
    this.render();
  }

  setRaw(next, sourceField) {
    this.raw = toUnsigned(next);
    if (!sourceField) this.blurValueInputs();
    this.render(sourceField);
  }

  blurValueInputs() {
    if (document.activeElement instanceof HTMLInputElement) {
      const active = document.activeElement;
      if (Object.values(this.inputs).includes(active)) active.blur();
    }
  }

  render(sourceField) {
    this.renderRegisterName();
    this.renderBits();
    this.renderValues(sourceField);
    this.renderSlider();
    this.renderPresets();
    this.renderWeights();
    this.renderTwos();
  }

  renderRegisterName() {
    const name = this.registerName.value.trim() || "D100";
    this.registerHeading.textContent = name;
  }

  renderBits() {
    const digits = hexDigits(this.raw);
    this.binaryReadout.textContent = formatBinary(this.raw);
    for (let bit = 0; bit < 16; bit += 1) {
      const on = bitValue(this.raw, bit) === 1;
      const view = this.bits[bit];
      view.value.textContent = on ? "1" : "0";
      view.button.classList.toggle("on", on);
      view.button.setAttribute("aria-pressed", on ? "true" : "false");
      const weight = this.sliderMode === "signed" ? signedWeight(bit) : unsignedWeight(bit);
      view.weight.textContent = String(weight);
      const role = bit === 15 ? "most significant bit, sign bit" : bit === 0 ? "least significant bit" : "";
      const state = on ? "on" : "off";
      const label = [`Bit ${bit}`, role, state, `weight ${weight}`].filter(Boolean).join(", ");
      view.button.setAttribute("aria-label", label);
      view.button.title = label;
    }
    this.digits.forEach((digit, index) => {
      digit.textContent = digits[index];
    });
    const signed = toSigned(this.raw);
    this.signNote.textContent = signed < 0
      ? "Sign bit is 1. INT16 is negative, while UINT16 reads the same bits as a positive magnitude."
      : "Sign bit is 0. INT16 and UINT16 are the same number.";
  }

  renderValues(sourceField) {
    const canonical = {
      signed: String(toSigned(this.raw)),
      unsigned: String(toUnsigned(this.raw)),
      hex: toHex(this.raw),
    };
    for (const name of Object.keys(canonical)) {
      if (name === sourceField) continue;
      this.inputs[name].value = canonical[name];
      this.clearField(name);
    }
    this.signedCard.classList.toggle("negative", toSigned(this.raw) < 0);
  }

  renderSlider() {
    const range = sliderRange(this.sliderMode);
    const value = rawToSlider(this.raw, this.sliderMode);
    this.syncingSlider = true;
    const minimum = String(range.min);
    const maximum = String(range.max);
    if (this.sliderMode === "unsigned") {
      if (this.slider.max !== maximum) this.slider.max = maximum;
      if (this.slider.min !== minimum) this.slider.min = minimum;
    } else {
      if (this.slider.min !== minimum) this.slider.min = minimum;
      if (this.slider.max !== maximum) this.slider.max = maximum;
    }
    if (this.slider.value !== String(value)) this.slider.value = String(value);
    this.syncingSlider = false;
    this.sliderMin.textContent = String(range.min);
    this.sliderMax.textContent = String(range.max);
    this.sliderReadout.textContent = String(value);
    this.slider.setAttribute("aria-valuetext", `${value} ${this.sliderMode}`);
    for (const button of this.modeButtons) {
      button.setAttribute("aria-checked", button.dataset.mode === this.sliderMode ? "true" : "false");
    }
  }

  renderPresets() {
    for (const preset of this.presets) {
      preset.button.setAttribute("aria-pressed", preset.raw === this.raw ? "true" : "false");
    }
  }

  renderWeights() {
    this.sumUnsigned.textContent = formatWeightedSum(this.raw, "unsigned");
    this.sumSigned.textContent = formatWeightedSum(this.raw, "signed");
  }

  renderTwos() {
    const explanation = explainTwosComplement(this.raw);
    this.twos.hidden = explanation === null;
    if (!explanation) return;
    this.twosSummary.textContent = explanation.summary;
    [...this.twosSteps.children].forEach((item, index) => {
      const step = explanation.steps[index];
      item.children[0].textContent = step.title;
      item.children[1].textContent = step.binary;
      item.children[2].textContent = step.note;
    });
  }

  showParse(name, result) {
    const message = this.messages[name];
    const input = this.inputs[name];
    message.textContent = result.ok ? "" : result.message;
    message.classList.toggle("invalid", !result.ok && result.reason === "invalid");
    message.classList.toggle("incomplete", !result.ok && result.reason === "incomplete");
    input.classList.toggle("invalid", !result.ok && result.reason === "invalid");
    input.setAttribute("aria-invalid", !result.ok && result.reason === "invalid" ? "true" : "false");
  }

  clearField(name) {
    this.showParse(name, { ok: true });
  }
}

const root = document.querySelector("#app");
if (!root) throw new Error("Missing application root.");
new RegisterApp(root);
