const MAIN_SCREEN=0;
const VIEW_SCREEN=1;
const EDIT_SCREEN=2;
const ADD_SCREEN=3;
const PHRASE_SCREEN=4;
const RECIPE_BREAK_DETECT = "------";

let currentScreen=MAIN_SCREEN;
let currentRecipe=null;
let convertedRecipe=null;

class UnitsConverter {
  static METRIC = 1;
  static IMPERIAL = 2;

  static VALUE_PARSE = '^([0-9¼½¾⅓⅔⅛\\./ -]+|a |another )';

  static NONE = -1;
  static SMIDGEN = 0;
  static PINCH = 1;
  static TSP = 2;
  static TBSP = 3;
  static FL_OZ = 4;
  static CUP = 5;
  static PINT = 6;
  static ML = 7;
  static OZ = 8;
  static LB = 9;
  static GRAM = 10;
  static DASH = 11;
  static KG = 12;
  static MM = 13;
  static CM = 14;
  static INCH = 15;
  static QT = 16;
  static CAN = 17;
  static PKG = 18;

  static TSP_TO_ML = 4.93;
  static TBSP_TO_ML = 14.79;
  static TBSP_TO_TSP = 3;
  static CUPS_TO_ML = 236.59;
  static PINTS_TO_ML = 473.18;
  static OZ_TO_ML = 29.57;
  static OZ_TO_G = 28.35;
  static OZ_TO_KG = 28350;
  static LB_TO_OZ = 16;
  static TSP_TO_PINCH = 16;
  static TSP_TO_SMIDGEN = 32;
  static OZ_TO_TSP = 6;
  static OZ_TO_TBSP = 2;
  static OZ_TO_DASH = 48;
  static OZ_TO_PINCH = 96;
  static OZ_TO_SMIDGEN = 192;
  static OZ_TO_CUPS = 1 / 8;
  static OZ_TO_PINTS = 1 / 16;
  static OZ_TO_QTS = 1 / 32;
  static INCH_TO_MM = 25.4;
  static FRACTIONS = '[¼½¾⅓⅔⅛]';
  static UNITS_DETECT = '([\\s-])?(oz|cups?|T\\b|t\\b|c\\b|c\\.|TBSP\\b|tbsp\\b|tsp\\b|tablespoons?\\b|Tablespoons?\\b|teaspoons?\\b|quart\\b|qt\\b|inch(es)?\\b|mls?\\b|cm\\b|mm\\b|liters?\\b|litres?\\b|g\\b|grams?\\b|kgs?\\b)';
  static VALUE_DETECT1 = '\\s[0-9]+\\.[0-9]+';
  static VALUE_DETECT2 = '\\s([0-9]+)?([\\s-])?(([0-9]+/[0-9]+)|[¼½¾⅓⅔⅛])';
  static VALUE_DETECT3 = '\\s[0-9]+';
  static INGREDIENT_DETECT = [
    UnitsConverter.VALUE_DETECT1 + UnitsConverter.UNITS_DETECT,
    UnitsConverter.VALUE_DETECT2 + UnitsConverter.UNITS_DETECT,
    UnitsConverter.VALUE_DETECT3 + UnitsConverter.UNITS_DETECT,
  ];

  static DRY_INGREDIENTS = [
    'noodles', 'ginger root', 'chocolate chips', 'asparagus', 'thyme', 'tomatoes', 'almonds',
    'cheese', 'prosciutto', 'arugula', 'macaroni', 'meat', 'potatoes', 'barramundi',
    'greens', 'beef', 'nuts', 'beans', 'mushrooms', 'sausage', 'chicken',
  ];
  static WET_INGREDIENTS = [
    'sauce', 'paste', 'soup', 'bouillon', 'juice', 'liqueur', 'extract', 'puree',
    'purée', 'stock', 'salsa', 'mayo', 'mayonnaise', 'dressing', 'milk', 'broth',
  ];
  static PREP_WORDS = [
    'chopped', 'diced', 'quartered', 'mashed', 'shredded', 'minced', 'cubed',
    'cooked', 'uncooked', 'drained', 'undrained', 'chilled', 'cold', 'halved',
    'seeded', 'peeled', 'divided', 'beaten', 'rinsed', 'blanched', 'juiced', 'dry',
    'flaked', 'melted', 'softened', 'room temperature',
  ];

  constructor() {
    this.value = 0;
    this.units = UnitsConverter.NONE;
    this.excludedPhrases = [];
  }

  isMass(ingredient) {
    let result = false;
    for (let i = 0; i < UnitsConverter.DRY_INGREDIENTS.length && !result; i++) {
      if (ingredient.toLowerCase().includes(UnitsConverter.DRY_INGREDIENTS[i])) {
        result = true;
      }
    }
    for (let i = 0; i < UnitsConverter.WET_INGREDIENTS.length && result; i++) {
      if (ingredient.toLowerCase().includes(UnitsConverter.WET_INGREDIENTS[i])) {
        result = false;
      }
    }
    return result;
  }

  roundMl(ml) {
    let rounded = 0;
    if (ml < 0.5) {
      rounded = Math.round(ml * 10) / 10;
    } else if (ml < 1) {
      rounded = Math.round(ml * 4) / 4;
    } else if (ml < 5) {
      rounded = Math.round(ml * 2) / 2;
    } else if (ml < 50) {
      rounded = Math.round(ml / 5) * 5;
    } else if (ml < 100) {
      rounded = Math.round(ml / 10) * 10;
    } else if (ml < 500) {
      rounded = Math.round(ml / 25) * 25;
    } else if (ml < 1000) {
      rounded = Math.round(ml / 100) * 100;
    } else {
      rounded = Math.round(ml / 250) * 250;
    }
    return rounded.toFixed(2).replace(/\.?0+$/, '');
  }

  roundGram(gram) {
    let rounded = 0;
    if (gram < 0.5) {
      rounded = Math.round(gram * 10) / 10;
    } else if (gram < 1) {
      rounded = Math.round(gram * 4) / 4;
    } else if (gram < 10) {
      rounded = Math.round(gram * 2) / 2;
    } else if (gram < 50) {
      rounded = Math.round(gram / 5) * 5;
    } else if (gram < 100) {
      rounded = Math.round(gram / 10) * 10;
    } else if (gram < 500) {
      rounded = Math.round(gram / 25) * 25;
    } else if (gram < 1000) {
      rounded = Math.round(gram / 100) * 100;
    } else {
      rounded = Math.round(gram / 250) * 250;
    }
    return rounded.toFixed(2).replace(/\.?0+$/, '');
  }

  roundOz(oz) {
    let rounded = 0;
    if (oz < 0.5) {
      rounded = Math.round(oz * 10) / 10;
    } else if (oz < 1) {
      rounded = Math.round(oz * 4) / 4;
    } else if (oz < 10) {
      rounded = Math.round(oz * 2) / 2;
    } else if (oz < 50) {
      rounded = Math.round(oz / 5) * 5;
    } else if (oz < 100) {
      rounded = Math.round(oz / 10) * 10;
    } else if (oz < 500) {
      rounded = Math.round(oz / 25) * 25;
    } else if (oz < 1000) {
      rounded = Math.round(oz / 100) * 100;
    } else {
      rounded = Math.round(oz / 250) * 250;
    }
    return rounded.toFixed(2).replace(/\.?0+$/, '');
  }

  roundTsp(tsp) {
    if (tsp < 0.047) {
      return 'a smidgeon';
    } else if (tsp < 0.094) {
      return 'a pinch';
    } else if (tsp < 0.19) {
      return '1/8 tsp';
    } else if (tsp < 0.38) {
      return '1/4 tsp';
    } else if (tsp < 0.75) {
      return '1/2 tsp';
    } else if (tsp < 1) {
      return '1 tsp';
    } else if (tsp < 4) {
      const intPart = Math.floor(tsp);
      const frac = tsp - intPart;
      if (frac < 0.75) {
        return `${intPart}${frac > 0.25 ? ' 1/2' : ''} tsp`;
      } else {
        return `${Math.round(tsp)} tsp`;
      }
    } else {
      return `${Math.round(tsp)} tsp`;
    }
  }

  roundTbsp(tbsp) {
    const intPart = Math.floor(tbsp);
    const frac = tbsp - intPart;
    if (frac < 0.75 && intPart < 2) {
      return this.roundTsp(tbsp * UnitsConverter.TBSP_TO_TSP);
    } else if (frac > 0.25 && frac < 0.75) {
      return `${intPart} 1/2 tbsp`;
    } else {
      return `${Math.round(tbsp)} tbsp`;
    }
  }

  roundMm(mm) {
    if (mm > 15) {
      return this.roundCm(mm / 10);
    } else {
      return `${Math.round(mm)}mm`;
    }
  }

  roundCm(cm) {
    let rounded = 0;
    if (cm < 1.5) {
      return this.roundMm(cm * 10);
    } else if (cm < 50) {
      rounded = Math.round(cm / 5) * 5;
    } else if (cm < 100) {
      rounded = Math.round(cm / 10) * 10;
    } else if (cm < 500) {
      rounded = Math.round(cm / 25) * 25;
    } else if (cm < 1000) {
      rounded = Math.round(cm / 100) * 100;
    } else {
      rounded = Math.round(cm / 250) * 250;
    }
    return `${rounded}cm`;
  }

  roundInches(value) {
    if (value < 0.09375) {
      return '1/16';
    } else if (value < 0.15625) {
      return '1/8';
    } else if (value < 0.21875) {
      return '3/16';
    } else if (value < 0.28125) {
      return '1/4';
    } else if (value < 0.34375) {
      return '5/16';
    } else if (value < 0.4375) {
      return '3/8';
    } else if (value < 0.5625) {
      return '1/2';
    } else if (value < 0.6875) {
      return '5/8';
    } else if (value < 0.8125) {
      return '3/4';
    } else if (value < 0.9375) {
      return '7/8';
    } else if (value < 1.375) {
      return '1';
    } else if (value < 3) {
      const intPart = Math.floor(value);
      const frac = value - intPart;
      if (frac < 0.875) {
        return `${intPart} ${this.roundInches(frac)}`;
      } else {
        return `${Math.round(value)}`;
      }
    } else if (value < 6) {
      const intPart = Math.floor(value);
      const frac = value - intPart;
      if (frac < 0.75) {
        return `${intPart}${frac > 0.25 ? ' 1/2' : ''}`;
      } else {
        return `${Math.round(value)}`;
      }
    } else {
      return `${Math.round(value)}`;
    }
  }

  roundGeneric(value) {
    if (value < 0.06) {
      return '';
    } else if (value < 0.19) {
      return '1/8';
    } else if (value < 0.29) {
      return '1/4';
    } else if (value < 0.42) {
      return '1/3';
    } else if (value < 0.58) {
      return '1/2';
    } else if (value < 0.71) {
      return '2/3';
    } else if (value < 0.875) {
      return '3/4';
    } else if (value < 1.29) {
      return '1';
    } else if (value < 3) {
      const intPart = Math.floor(value);
      const frac = value - intPart;
      if (frac < 0.875) {
        return `${intPart} ${this.roundGeneric(frac)}`;
      } else {
        return `${Math.round(value)}`;
      }
    } else if (value < 6) {
      const intPart = Math.floor(value);
      const frac = value - intPart;
      if (frac < 0.75) {
        return `${intPart}${frac > 0.25 ? ' 1/2' : ''}`;
      } else {
        return `${Math.round(value)}`;
      }
    } else {
      return `${Math.round(value)}`;
    }
  }

  roundPint(pint) {
    if (pint < 4) {
      const intPart = Math.floor(pint);
      const frac = pint - intPart;
      if (frac < 0.75) {
        return `${intPart === 0 ? '' : `${intPart}${frac > 0.25 ? ' 1/2' : ''}`} pint${intPart === 0 ? '' : 's'}`;
      } else {
        return `${Math.round(pint)} pint${Math.round(pint) === 1 ? '' : 's'}`;
      }
    } else {
      return `${Math.round(pint)} pints`;
    }
  }

  roundLb(lb) {
    if (lb < 15 / 16) {
      const oz = lb * UnitsConverter.LB_TO_OZ;
      return `${Math.round(oz)} oz`;
    } else if (lb < 4) {
      const intPart = Math.floor(lb);
      const frac = lb - intPart;
      if (frac < 0.75) {
        return `${intPart === 0 ? '' : `${intPart}${frac > 0.25 ? ' 1/2' : ''}`} lb`;
      } else {
        return `${Math.round(lb)} lb`;
      }
    } else {
      return `${Math.round(lb)} lb`;
    }
  }

  toString(round) {
    const formatValue = (value) => value.toFixed(4);

    switch (this.units) {
      case UnitsConverter.GRAM:
        return round ? `${this.roundGram(this.value).trim()} g` : `${formatValue(this.value)} g`;
      case UnitsConverter.ML:
        return round ? `${this.roundMl(this.value).trim()} ml` : `${formatValue(this.value)} ml`;
      case UnitsConverter.OZ:
      case UnitsConverter.FL_OZ:
        return round ? `${this.roundOz(this.value).trim()} oz` : `${formatValue(this.value)} oz`;
      case UnitsConverter.LB:
        return this.roundLb(this.value);
      case UnitsConverter.TSP:
        return round ? this.roundTsp(this.value) : `${formatValue(this.value)} tsp`;
      case UnitsConverter.PINT:
        return round ? this.roundPint(this.value) : `${formatValue(this.value)} pt`;
      case UnitsConverter.INCH:
        return round ? `${this.roundInches(this.value)} inch${this.value > 1 ? 'es' : ''}` : `${formatValue(this.value)} inch${this.value > 1 ? 'es' : ''}`;
      case UnitsConverter.MM:
        return round ? this.roundMm(this.value) : `${formatValue(this.value)} mm`;
      case UnitsConverter.CM:
        return round ? this.roundCm(this.value) : `${formatValue(this.value)} cm`;
      case UnitsConverter.QT:
        return round ? `${this.roundGeneric(this.value).trim()} qt` : `${formatValue(this.value)} qt`;
      case UnitsConverter.CUP:
        return round ? `${this.roundGeneric(this.value).trim()} c` : `${formatValue(this.value)} c`;
      case UnitsConverter.KG:
        return round ? `${this.roundGeneric(this.value).trim()} kg` : `${formatValue(this.value)} kg`;
      case UnitsConverter.TBSP:
        return round ? this.roundTbsp(this.value) : `${formatValue(this.value)} tbsp`;
      case UnitsConverter.CAN:
        return round ? `${this.roundGeneric(this.value).trim()} can${this.value > 1 ? 's' : ''}` : `${formatValue(this.value)} can${this.value > 1 ? 's' : ''}`;
      case UnitsConverter.PKG:
        return round ? `${this.roundGeneric(this.value).trim()} pkg${this.value > 1 ? 's' : ''}` : `${formatValue(this.value)} pkg${this.value > 1 ? 's' : ''}`;
      default:
        return round ? this.roundGeneric(this.value).trim() : formatValue(this.value);
    }
  }

  getUnitsString() {
    switch (this.units) {
      case UnitsConverter.TBSP:
        return 'T';
      case UnitsConverter.TSP:
        return 't';
      case UnitsConverter.SMIDGEN:
        return 'smidgen';
      case UnitsConverter.PINCH:
        return 'pinch';
      case UnitsConverter.FL_OZ:
      case UnitsConverter.OZ:
        return 'oz';
      case UnitsConverter.CUP:
        return 'c';
      case UnitsConverter.PINT:
        return 'pint';
      case UnitsConverter.ML:
        return 'ml';
      case UnitsConverter.LB:
        return 'lb';
      case UnitsConverter.GRAM:
        return 'g';
      case UnitsConverter.CAN:
        return 'can';
      case UnitsConverter.PKG:
        return 'pkg';
      default:
        return '';
    }
  }

  setUnits(ingredient) {
    let unitWord = '';
    this.units = UnitsConverter.NONE;
    const words = ingredient.split(/[\s\t\xA0]+/);
    let firstWord = words[0] || '';
    let secondWord = words[1] || '';
    let thirdWord = words[2] || '';

    if (firstWord.length === 0) {
      firstWord = secondWord;
      secondWord = thirdWord;
      unitWord = ' ';
    }

    if (firstWord) {
      unitWord = firstWord;
      const firstWordLc = firstWord.toLowerCase();
      if (firstWord === 'T.' || firstWord === 'T' || firstWordLc === 'tbsp.' || firstWordLc === 'tbsp' || firstWordLc === 'tablespoon' || firstWordLc === 'tablespoons') {
        this.units = UnitsConverter.TBSP;
      } else if (firstWord === 't.' || firstWord === 't' || firstWordLc === 'tsp' || firstWordLc === 'tsp.' || firstWordLc === 'teaspoon' || firstWordLc === 'teaspoons') {
        this.units = UnitsConverter.TSP;
      } else if (firstWordLc === 'c.' || firstWordLc === 'c' || firstWordLc === 'cup' || firstWordLc === 'cups') {
        this.units = UnitsConverter.CUP;
      } else if (firstWordLc === 'smidgen') {
        this.units = UnitsConverter.SMIDGEN;
      } else if (firstWordLc === 'dash') {
        this.units = UnitsConverter.DASH;
      } else if (firstWordLc === 'pinch') {
        this.units = UnitsConverter.PINCH;
      } else if (firstWordLc === 'g' || firstWordLc === 'gram' || firstWordLc === 'grams') {
        this.units = UnitsConverter.GRAM;
      } else if (firstWordLc === 'oz' || firstWordLc === 'oz.' || firstWordLc === 'ounces' || firstWordLc === 'ounce') {
        this.units = UnitsConverter.OZ;
      } else if ((firstWordLc === 'fl' || firstWordLc === 'fl.') && (secondWord.toLowerCase() === 'oz' || secondWord.toLowerCase() === 'oz.')) {
        this.units = UnitsConverter.FL_OZ;
        unitWord += ` ${secondWord}`;
      } else if (firstWordLc === 'quart' || firstWordLc === 'quarts' || firstWordLc === 'qt' || firstWordLc === 'qts') {
        this.units = UnitsConverter.QT;
      } else if (firstWordLc === 'pint' || firstWordLc === 'pints') {
        this.units = UnitsConverter.PINT;
      } else if (firstWordLc === 'pound' || firstWordLc === 'pounds' || firstWordLc === 'lb.' || firstWordLc === 'lb' || firstWordLc === 'lbs' || firstWordLc === 'lbs.') {
        this.units = UnitsConverter.LB;
      } else if (firstWordLc === 'inch' || firstWordLc === 'inches') {
        this.units = UnitsConverter.INCH;
      } else if (firstWordLc === 'ml' || firstWordLc === 'ml.' || firstWordLc === 'milliliter' || firstWordLc === 'milliliters') {
        this.units = UnitsConverter.ML;
      } else if (firstWordLc === 'cm' || firstWordLc === 'cm.') {
        this.units = UnitsConverter.CM;
      } else if (firstWordLc === 'mm' || firstWordLc === 'mm.') {
        this.units = UnitsConverter.MM;
        this.value /= 10;
      } else if (firstWordLc === 'can' || firstWordLc === 'cans') {
        this.units = UnitsConverter.CAN;
      } else if (firstWordLc === 'pkg.' || firstWordLc === 'pkg' || firstWordLc === 'package') {
        this.units = UnitsConverter.PKG;
      } else {
        this.units = UnitsConverter.NONE;
        unitWord = '';
      }
    }
    return unitWord;
  }

  parseNumber(value) {
    if (value.toLowerCase() === 'a' || value.toLowerCase() === 'another') {
      return 1;
    }
    try {
      if (value.length > 1 && value.substring(value.length - 1).match(new RegExp(UnitsConverter.FRACTIONS))) {
        return this.parseNumber(value.substring(0, value.length - 1)) + this.parseNumber(value.substring(value.length - 1));
      } else {
        if (value === '¼') return 1 / 4;
        else if (value === '½') return 1 / 2;
        else if (value === '¾') return 3 / 4;
        else if (value === '⅓') return 1 / 3;
        else if (value === '⅔') return 2 / 3;
        else if (value === '⅛') return 1 / 8;
        else if (value.includes('/')) {
          const parts = value.split('/');
          return this.parseNumber(parts[0]) / this.parseNumber(parts[1]);
        } else {
          return parseFloat(value);
        }
      }
    } catch (e) {
      return -1;
    }
  }

  setQuantity(ingredient) {
    this.units = UnitsConverter.NONE;
    this.value = 0;
    const pattern = new RegExp(UnitsConverter.VALUE_PARSE);
    let valueString = '';
    let remainingIngredient = ingredient.replace(/[\s\t\xA0]/g, ' ').trim();
    const matcher = remainingIngredient.match(pattern);

    if (matcher) {
      valueString = matcher[0];
      remainingIngredient = remainingIngredient.substring(valueString.length);
      remainingIngredient = remainingIngredient.replace(/[\s\t\xA0]/g, ' ');
      const unitWord = this.setUnits(remainingIngredient);
      if (unitWord) {
        if (unitWord.length < remainingIngredient.length) {
          remainingIngredient = remainingIngredient.substring(unitWord.length);
        } else {
          remainingIngredient = '';
        }
      }
    } else {
      valueString = '';
    }

    if (valueString) {
      const valueParts = valueString.trim().split(/[ -]/);
      let value = 0;
      for (const valuePart of valueParts) {
        value += this.parseNumber(valuePart);
      }
      this.value = value;
      remainingIngredient = remainingIngredient.trim();
    }

    if (this.value === -1) {
      return ingredient;
    }
    return remainingIngredient;
  }

  convert(ingredient, fromServings, toServings, fromSystem, toSystem, round, setBaseUnits = false) {
    this.value = 0;
    this.units = UnitsConverter.NONE;
    let ingredientRemainder = this.setQuantity(ingredient);

    if (this.value === -1) {
      return ingredient;
    }

    if (this.units === UnitsConverter.NONE) {
      return `${this.roundGeneric((this.value * toServings) / fromServings)} ${ingredientRemainder}`.trim();
    }

    if (this.units === UnitsConverter.INCH && toSystem === UnitsConverter.METRIC) {
      this.value *= UnitsConverter.INCH_TO_MM;
      this.units = UnitsConverter.MM;
      return `${this.toString(round)} ${ingredientRemainder.trim()}`;
    }
    if (this.units === UnitsConverter.MM && toSystem === UnitsConverter.IMPERIAL) {
      this.value /= UnitsConverter.INCH_TO_MM;
      this.units = UnitsConverter.INCH;
      return `${this.toString(round)} ${ingredientRemainder.trim()}`;
    }
    if (this.units === UnitsConverter.CM && toSystem === UnitsConverter.IMPERIAL) {
      this.value = (this.value / UnitsConverter.INCH_TO_MM) * 10;
      this.units = UnitsConverter.INCH;
      return `${this.toString(round)} ${ingredientRemainder.trim()}`;
    }
    if (setBaseUnits && this.units === UnitsConverter.CM) {
      this.units = UnitsConverter.MM;
      this.value *= 10;
    }
    if (this.units === UnitsConverter.INCH || this.units === UnitsConverter.CM || this.units === UnitsConverter.MM) {
      return `${this.toString(round)} ${ingredientRemainder.trim()}`;
    }

    this.value = (this.value * toServings) / fromServings;

    if (this.units === UnitsConverter.OZ && this.isMass(ingredientRemainder)) {
      this.units = UnitsConverter.LB;
      this.value /= UnitsConverter.LB_TO_OZ;
    }

    if (this.units === UnitsConverter.LB) {
      this.units = UnitsConverter.OZ;
      this.value *= UnitsConverter.LB_TO_OZ;
      if (toSystem === UnitsConverter.IMPERIAL) {
        if (this.value >= UnitsConverter.LB_TO_OZ) {
          this.value /= UnitsConverter.LB_TO_OZ;
          this.units = UnitsConverter.LB;
        }
      } else {
        this.units = UnitsConverter.GRAM;
        this.value *= UnitsConverter.OZ_TO_G;
        if ((this.value > 490 && this.value < 510) || this.value > 800) {
          this.value /= 1000;
          this.units = UnitsConverter.KG;
        }
      }
      return `${this.toString(round)} ${ingredientRemainder.trim()}`;
    }

    if (this.units === UnitsConverter.DASH) {
      this.units = UnitsConverter.OZ;
      this.value /= UnitsConverter.OZ_TO_DASH;
    } else if (this.units === UnitsConverter.SMIDGEN) {
      this.units = UnitsConverter.OZ;
      this.value /= UnitsConverter.OZ_TO_SMIDGEN;
    } else if (this.units === UnitsConverter.PINCH) {
      this.units = UnitsConverter.OZ;
      this.value /= UnitsConverter.OZ_TO_PINCH;
    } else if (this.units === UnitsConverter.TSP) {
      this.units = UnitsConverter.OZ;
      this.value /= UnitsConverter.OZ_TO_TSP;
    } else if (this.units === UnitsConverter.TBSP) {
      this.units = UnitsConverter.OZ;
      this.value /= UnitsConverter.OZ_TO_TBSP;
    } else if (this.units === UnitsConverter.CUP) {
      this.units = UnitsConverter.OZ;
      this.value /= UnitsConverter.OZ_TO_CUPS;
    } else if (this.units === UnitsConverter.PINT) {
      this.units = UnitsConverter.OZ;
      this.value /= UnitsConverter.OZ_TO_PINTS;
    } else if (this.units === UnitsConverter.QT) {
      this.units = UnitsConverter.OZ;
      this.value /= UnitsConverter.OZ_TO_QTS;
    }

    if (this.units === UnitsConverter.OZ && toSystem === UnitsConverter.METRIC) {
      this.units = UnitsConverter.ML;
      this.value *= UnitsConverter.OZ_TO_ML;
    }

    if (toSystem === UnitsConverter.IMPERIAL) {
      if (this.units === UnitsConverter.ML) {
        this.units = UnitsConverter.OZ;
        this.value /= UnitsConverter.OZ_TO_ML;
      }
      if (this.units === UnitsConverter.OZ && !setBaseUnits) {
        this.doBestGuessImperial();
      }
      if (this.units === UnitsConverter.GRAM) {
        this.units = UnitsConverter.LB;
        this.value = this.value / UnitsConverter.OZ_TO_G / UnitsConverter.LB_TO_OZ;
      }
    }

    return `${this.toString(round)} ${ingredientRemainder.trim()}`;
  }

  doBestGuessImperial() {
    if (this.value > 10 / UnitsConverter.OZ_TO_CUPS) {
      // Do nothing, keep as oz
    } else if (this.value > 7 / 32 / UnitsConverter.OZ_TO_CUPS) {
      this.units = UnitsConverter.CUP;
      this.value *= UnitsConverter.OZ_TO_CUPS;
    } else if (this.value >= 0.83 / UnitsConverter.OZ_TO_TBSP) {
      this.units = UnitsConverter.TBSP;
      this.value *= UnitsConverter.OZ_TO_TBSP;
    } else {
      this.units = UnitsConverter.TSP;
      this.value *= UnitsConverter.OZ_TO_TSP;
    }
  }

  convertImpToMet(directions, fromServings, toServings, fromSystem, toSystem) {
    let newDirections = directions;
    let temperature;
    let phrase;
    let matcher;

    let pattern = /([0-9]{3})(°?F| degrees? ?F?)/g;
    while ((matcher = pattern.exec(newDirections)) !== null) {
      temperature = matcher[1];
      phrase = matcher[0];
      temperature = this.fToC(temperature);
      newDirections = newDirections.replace(phrase.trim(), `${temperature}°C`);
    }

    pattern = /([0-9]{3})°/g;
    while ((matcher = pattern.exec(newDirections)) !== null) {
      temperature = matcher[1];
      phrase = matcher[0];
      temperature = this.fToC(temperature);
      newDirections = newDirections.replace(phrase.trim(), `${temperature}°C`);
    }

    newDirections = this.convertSystemAndValue(newDirections, fromServings, toServings, fromSystem, toSystem);
    return newDirections;
  }

  convertMetToImp(directions, fromServings, toServings, fromSystem, toSystem) {
    let newDirections = directions;
    let temperature;
    let phrase;
    let matcher;

    let pattern = /([0-9]{3})(°?C| degrees? ?C?)/g;
    while ((matcher = pattern.exec(newDirections)) !== null) {
      temperature = matcher[1];
      phrase = matcher[0];
      temperature = this.cToF(temperature);
      newDirections = newDirections.replace(phrase.trim(), `${temperature}°F`);
    }

    newDirections = this.convertSystemAndValue(newDirections, fromServings, toServings, fromSystem, toSystem);
    return newDirections;
  }

  fToC(degrees) {
    let result = degrees;
    try {
      const f = parseFloat(degrees);
      const c = ((f - 32) * 5) / 9;
      result = `${Math.round(c / 10) * 10}`;
    } catch (e) {
      // ignore
    }
    return result;
  }

  cToF(degrees) {
    let result = degrees;
    try {
      const c = parseFloat(degrees);
      const f = (c * 9) / 5 + 32;
      result = `${Math.round(f / 25) * 25}`;
    } catch (e) {
      // ignore
    }
    return result;
  }

  convertDirections(directions, fromServings, toServings, fromSystem, toSystem, excludedPhrases) {
    this.excludedPhrases = excludedPhrases;
    let newDirections = directions;
    if (toSystem === UnitsConverter.METRIC && fromSystem === UnitsConverter.IMPERIAL) {
      newDirections = this.convertImpToMet(newDirections, fromServings, toServings, fromSystem, toSystem);
    } else if (toSystem === UnitsConverter.IMPERIAL && fromSystem === UnitsConverter.METRIC) {
      newDirections = this.convertMetToImp(newDirections, fromServings, toServings, fromSystem, toSystem);
    } else {
      newDirections = this.convertSystemAndValue(newDirections, fromServings, toServings, fromSystem, toSystem);
    }
    this.excludedPhrases = null;
    return newDirections;
  }

  convertSystemAndValue(directions, fromServings, toServings, fromSystem, toSystem) {
    let newDirections = directions;
    let phrase;
    let matcher;

    UnitsConverter.INGREDIENT_DETECT.forEach(patternString => {
      const pattern = new RegExp(patternString, 'g');
      let newPhrase;
      while ((matcher = pattern.exec(newDirections)) !== null) {
        phrase = matcher[0];
        if (this.isExcluded(phrase)) {
          newPhrase = this.convert(phrase, fromServings, fromServings, fromSystem, toSystem, false);
        } else {
          newPhrase = this.convert(phrase, fromServings, toServings, fromSystem, toSystem, false);
        }
        newDirections = newDirections.replace(phrase, `${phrase.match(/^\s.+/) ? ' ' : ''}${newPhrase}`);
      }
    });

    const finalPattern = new RegExp(UnitsConverter.INGREDIENT_DETECT[0], 'g');
    let finalMatcher;
    while ((finalMatcher = finalPattern.exec(newDirections)) !== null) {
      phrase = finalMatcher[0];
      const newPhrase = this.convert(phrase, toServings, toServings, toSystem, toSystem, true);
      newDirections = newDirections.replace(phrase, `${phrase.match(/^\s.+/) ? ' ' : ''}${newPhrase.trim()}`);
    }

    return newDirections;
  }

  isExcluded(phrase) {
    let excluded = false;
    if (this.excludedPhrases && this.excludedPhrases.length > 0) {
      for (let i = 0; i < this.excludedPhrases.length && !excluded; i++) {
        if (phrase === this.excludedPhrases[i].phraseText) {
          excluded = true;
        }
      }
    }
    return excluded;
  }

  getPhrases(directions) {
    const phrases = [];
    let phrase;
    let matcher;
    let pattern;

    UnitsConverter.INGREDIENT_DETECT.forEach(patternString => {
      pattern = new RegExp(patternString, 'g');
      while ((matcher = pattern.exec(directions)) !== null) {
        try {
          phrase = matcher[0];
          const start = matcher.index;
          const end = start + phrase.length;

          const directionsPhrase = {
            phraseText: phrase,
            phraseStart: start,
            phraseEnd: end,
            phraseContext: '',
          };

          let cStart = start - 20;
          if (cStart < 0) cStart = 0;
          let cEnd = end + 20;
          if (cEnd > directions.length) cEnd = directions.length;

          for (let i = start; i > cStart; i--) {
            if ('\n,.;'.includes(directions.charAt(i))) {
              cStart = i;
            }
          }
          let done = false;
          for (let i = cStart; i < start && !done; i++) {
            if (directions.charAt(i) === ' ') cStart = i;
          }
          done = false;
          let tempEnd = cEnd;
          for (let i = end; i < tempEnd && !done; i++) {
            if ('\n,.;'.includes(directions.charAt(i))) {
              cEnd = i;
              done = true;
            }
            if (directions.charAt(i) === ' ') {
              cEnd = i;
            }
          }

          if (' ,.;'.includes(directions.charAt(cStart))) {
            cStart++;
          }
          const context = `...${directions.substring(cStart, cEnd).trim()}...`;
          directionsPhrase.phraseContext = context;
          phrases.push(directionsPhrase);
        } catch (e) {
          // Skip if an error occurs
        }
      }
    });

    return phrases;
  }

  stripPrep(name) {
    let result = name;
    UnitsConverter.PREP_WORDS.forEach(prep => {
      const regex1 = new RegExp(`, ${prep}`, 'gi');
      const regex2 = new RegExp(` and ${prep}\\.?$`, 'gi');
      result = result.replace(regex1, '').replace(regex2, '');
    });
    return result.toLowerCase();
  }
}

class RecipeParser {
  static IMPERIAL_DETECTION_UNITS = ["tbsp", "tablespoons", "tablespoon", "tsp", "teaspoons", "teaspoon", "oz", "cup", "cups", "c", "lb", "pound", "lbs", "pounds", "can", "package", "pkg"];
  static METRIC_DETECTION_UNITS = ["ml", "g", "kg", "gram", "grams", "l", "liter", "liters", "litre", "litres", "can", "package", "pkg"];

  constructor() {
    this.lines = null;
    this.titleStart = -1;
    this.ingredientsStart = -1;
    this.directionsStart = -1;
    this.notesStart = -1;
    this.prepTimeString = "";
    this.cookTimeString = "";
    this.totalTimeString = "";
    this.servingsString = "";
    this.isMetric = false;
    this.directions = "";
    this.title = "";
    this.ingredients = "";
    this.servings = 4;
    this.notes = "";
    this.rawText = "";
    this.isVerbatim = false;
  }

  static toTitleCase(text) {
    if (!text) {
      return text;
    }
    return text.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  parseTitle() {
    let title = "unknown";
    let found = false;
    for (let i = 0; i < this.lines.length && !found; i++) {
      if (this.lines[i].trim() !== "" && !this.isSpecialLine(this.lines[i])) {
        title = this.lines[i];
        found = true;
        this.titleStart = i;
      }
    }
    this.title = RecipeParser.toTitleCase(title);
  }

  parseIngredients() {
    let ingredients = "";
    const end = (this.directionsStart > this.ingredientsStart) ? this.directionsStart : ((this.notesStart > this.directionsStart) ? this.notesStart : this.lines.length);
    for (let i = this.ingredientsStart + 1; i < end; i++) {
      if (this.lines[i].trim() !== "" && !this.isSpecialLine(this.lines[i])) {
        if (ingredients.length > 0) {
          ingredients += "\n";
        }
        ingredients += this.parseDoubleLine(this.lines[i]);
      }
    }
    this.ingredients = ingredients + "\n";
    this.parseMetric();
  }

  parseDoubleLine(line) {
    return line.replace(/\s{3,}/g, "\n");
  }

  parseMetric() {
    let metricCount = 0;
    let imperialCount = 0;
    const lines = this.ingredients.split("\n");
    for (const line of lines) {
      try {
        const strippedLine = line.toLowerCase().replace(/[0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞/.\-]/g, "").trim();
        const units = strippedLine.split(/\s|\t|\u00A0/)[0];
        let found = false;

        if (RecipeParser.IMPERIAL_DETECTION_UNITS.includes(units)) {
          imperialCount++;
          found = true;
        } else if (RecipeParser.METRIC_DETECTION_UNITS.includes(units)) {
          metricCount++;
          found = true;
        }
      } catch (e) {
        // Ignore exceptions, continue loop
      }
    }
    if (metricCount > imperialCount) {
      this.isMetric = true;
    }
  }

  isMetric() {
    return this.isMetric;
  }

  parseDirections() {
    let directions = "";
    const end = (this.notesStart > this.directionsStart) ? this.notesStart : this.lines.length;
    for (let i = this.directionsStart + 1; i < end; i++) {
      if (this.lines[i].trim() !== "" && !this.isSpecialLine(this.lines[i])) {
        let line = this.lines[i];
        if (line.match(/^[0-9]+\)?[. ].*/)) {
          line = line.substring(line.indexOf(" ")).trim();
        }
        directions += line;

        if (directions.trim().endsWith(".") || directions.trim().endsWith(":") || this.isVerbatim) {
          directions = directions.trim() + "\n";
        } else if (directions.endsWith("-")) {
          directions = directions.substring(0, directions.length - 1);
        } else {
          directions += " ";
        }
      }
    }
    this.directions = directions.trim();
  }

  parseNotes() {
    let notes = "";
    for (let i = this.notesStart + 1; i < this.lines.length; i++) {
      if (this.lines[i].trim() !== "") {
        notes += this.lines[i] + "\n";
      }
    }
    this.notes = notes.trim();
  }

  isSpecialLine(line) {
    const lowerCaseLine = line.toLowerCase();
    if (lowerCaseLine.startsWith("serves") || lowerCaseLine.startsWith("servings") || (!this.isVerbatim && (lowerCaseLine.endsWith("servings") || lowerCaseLine.endsWith("servings.") || line.trim().toLowerCase().match(/^.+[0-9]+ servings\.$/)))) {
      this.servingsString = line;
      return true;
    }
    if (lowerCaseLine.startsWith("prep time") || lowerCaseLine.startsWith("preparation time")) {
      this.prepTimeString = line;
      return true;
    }
    if (lowerCaseLine.startsWith("cook time") || lowerCaseLine.startsWith("bake time") || lowerCaseLine.endsWith("baking time") || lowerCaseLine.endsWith("cooking time")) {
      this.cookTimeString = line;
      return true;
    }
    if (lowerCaseLine.startsWith("total time")) {
      this.totalTimeString = line;
      return true;
    }
    return false;
  }

  parseServings() {
    let servings = 4;
    if (this.servingsString) {
      const elements = this.servingsString.split(/[\s\u00A0.\t]/);
      for (const element of elements) {
        const num = parseInt(element, 10);
        if (!isNaN(num)) {
          servings = num;
          break;
        }
      }
    }
    this.servings = servings;
  }

  setRawText(text, verbatim) {
    this.isVerbatim = verbatim;
    this.rawText = text;
    this.parse();
  }

  parse() {
    let foundFirstNonBlankLine = false;
    let firstBreak = -1;
    let secondBreak = -1;
    this.lines = this.rawText.split(/\r?\n/).map(line => line.trim());

    for (let i = 0; i < this.lines.length; i++) {
      if (!foundFirstNonBlankLine && this.lines[i].trim() !== "") {
        foundFirstNonBlankLine = true;
      }
      if (foundFirstNonBlankLine && firstBreak > -1 && secondBreak < 0 && this.lines[i].trim() === "") {
        secondBreak = i;
      }
      if (foundFirstNonBlankLine && firstBreak < 0 && this.lines[i].trim() === "") {
        firstBreak = i;
      }

      const lowerCaseLine = this.lines[i].toLowerCase();
      if (lowerCaseLine.startsWith("ingredients") || lowerCaseLine === "you will need") {
        this.ingredientsStart = i;
      }
      if (lowerCaseLine.startsWith("directions") || lowerCaseLine.startsWith("instructions") || lowerCaseLine.startsWith("preparation")) {
        this.directionsStart = i;
      }
      if (lowerCaseLine.startsWith("notes")) {
        this.notesStart = i;
      }
    }

    if (this.ingredientsStart < 0) {
      this.ingredientsStart = firstBreak;
      if (this.ingredientsStart < 0) {
        this.scanForIngredients();
      }
    }
    if (this.directionsStart < 0) {
      this.directionsStart = secondBreak;
    }

    this.parseTitle();
    if (this.ingredientsStart > -1) this.parseIngredients();
    if (this.directionsStart > -1) this.parseDirections();
    if (this.notesStart > -1) this.parseNotes();
    this.parseServings();
  }

  scanForIngredients() {
    for (let i = 1; i < this.lines.length; i++) {
      const line = this.lines[i];
      try {
        const strippedLine = line.toLowerCase().replace(/[0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞/.\-]/g, "").trim();
        const units = strippedLine.split(/\s|\t|\u00A0/)[0];
        let found = false;

        if (RecipeParser.IMPERIAL_DETECTION_UNITS.includes(units)) {
          if (this.ingredientsStart < 0) this.ingredientsStart = i - 1;
          found = true;
        } else if (RecipeParser.METRIC_DETECTION_UNITS.includes(units)) {
          if (this.ingredientsStart < 0) this.ingredientsStart = i - 1;
          found = true;
        }

        if (found) {
          this.directionsStart = i;
        }
      } catch (e) {
        // Ignore exceptions
      }
    }
  }

  getDirections() {
    return this.directions;
  }

  getIngredients() {
    return this.ingredients;
  }

  getServings() {
    return this.servings;
  }

  getTitle() {
    return this.title;
  }

  getNotes() {
    return this.notes;
  }
}

// Show a modal dialog
function showModal(title, body, buttons)
{
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').textContent = body;
    const actions = document.getElementById('modal-actions');
    actions.innerHTML = '';
    buttons.forEach(btn =>
    {
        const b = document.createElement('button');
        b.className = 'modal-btn';
        b.textContent = btn.text;
        b.onclick = () =>
        {
            hideModal();
            if (btn.onClick) btn.onClick();
        };
        actions.appendChild(b);
    });
    document.getElementById('modal-overlay').style.display = 'flex';
}

//close a modal dialog
function hideModal()
{
    document.getElementById('modal-overlay').style.display = 'none';
}

var idMap = new Map();
function getRecipeId(object)
{
    if(idMap.values().toArray().includes(object))
    {
        for (let [key, value] of idMap.entries())
        {
            if (value === object)
                return key;
            }
        }
    else
    {
        let key=self.crypto.randomUUID();
        idMap.set(key,object);
        return key;
    }
}

function getRecipeById(id)
{
    return idMap.get(id);
}


class Recipe
{

    constructor(obj)
    {
        obj && Object.assign(this, obj);
    }

    toPlainText(includeNotes) {
        let textContent = `${this.getTitle()}\n`;
        textContent += `Ingredients\n${this.getIngredients()}`;
        textContent += `Directions\n${this.getDirections()}`;

        if (!textContent.endsWith('\n')) textContent += '\n';

        textContent += `Serves ${this.getServings()}\n`;

        if (includeNotes && this.notes && this.notes.trim() !== '') {
            textContent += `Notes\n${this.notes}${(this.notes.endsWith('\n')) ? '' : '\n'}`;
        }

        return textContent;
    }

    toString() {
        return this.title ? this.title : 'Untitled Recipe';
    }

    compareTo(recipe) {
        if (Recipes.getInstance().getSortOn() === Recipes.NAME) {
            return this.title.localeCompare(recipe.getTitle());
        } else {
            return recipe.sortScore - this.sortScore;
        }
    }

    // Getter and Setter methods
    getTitle() {
        return this.title;
    }

    setTitle(title) {
        this.title = title;
    }

    getServings() {
        return this.servings;
    }

    setServings(servings) {
        this.servings = typeof servings === 'number'
            ? servings.toString()
            : servings;
    }

    isMetric() {
        return this.isMetric;
    }

    setMetric(metric) {
        this.isMetric = metric;
    }

    getIngredients() {
        return this.ingredients;
    }

    setIngredients(ingredients) {
        this.ingredients = ingredients;
    }

    getDirections() {
        return this.directions;
    }

    setDirections(directions) {
        this.directions = directions;
    }

    getExcludedPhrases() {
        return this.excludedPhrases;
    }

    setExcludedPhrases(excludedPhrases) {
        this.excludedPhrases = excludedPhrases;
    }

    getSortScore() {
        return this.sortScore;
    }

    setSortScore(sortScore) {
        this.sortScore = sortScore;
    }

    getNotes() {
        return this.notes;
    }

    setNotes(notes) {
        this.notes = notes;
    }
}




class Recipes {
    static NAME = 0;
    static SCORE = 1;

    static #instance = null;

    constructor() {
        if (Recipes.#instance) {
            return Recipes.#instance;
        }
        Recipes.#instance = this;

        this.list = [];
        this.currentRecipe = null;
        this.sortOn = Recipes.NAME;
        this.rawText = "";
        this.visionText = null;
        this.recipesType = new Array(); // For type reference in JSON operations
    }

    static getInstance() {
        if (!Recipes.#instance) {
            Recipes.#instance = new Recipes();
        }
        return Recipes.#instance;
    }

    getList() {
        return this.list;
    }

    sort() {
        if(Recipes.getInstance().sortOn==Recipes.NAME)
        {
            this.list.sort((a, b) => {
                return a.title.localeCompare(b.title);
            });
        }
        else
        {
            this.list.sort((a, b) => {
                return b.sortScore-a.sortScore;
            });
        }
    }

    async load() {
        try {
            const json = localStorage.getItem('rwRecipes') || '';
            this.list = [];
            if (json)
            {
                let rs= JSON.parse(json)
                rs.forEach((r) => this.list.push(new Recipe(r)));
                this.sort();
            }
            else
            {
                let rs=JSON.parse(`[{"title":"Pancakes","servings":"4","isMetric":false,"ingredients":"3/4 c flour\\n2 t baking powder\\n1/4 t salt\\n1 t sugar\\n1 c milk\\n1 egg\\n3 T melted butter\\n","directions":"combine dry ingredients.\\nmix in wet ingredients.\\ncook on hot griddle.\\nflip halfway through.","notes":"This is an example recipe. Try changing the number of servings or toggling Imperial to Metric."}]`);
                rs.forEach((r) => this.list.push(new Recipe(r)));
                this.sort();
            }

        } catch (e) {
            console.error('Error loading recipes:', e);
        }
    }

    async save() {
        try {
            const serializedRecipes = JSON.stringify(this.list);

            localStorage.setItem('rwRecipes', serializedRecipes);

            this.sort();
        } catch (e) {
            console.error('Error saving recipes:', e);
        }
    }

    toPlainText(includeNotes) {
        const RECIPE_BREAK = "-----------------";
        const textContent = [];

        this.list.forEach((recipe, index) => {
            if (index !== 0) {
                textContent.push(RECIPE_BREAK + "\n");
            }
            textContent.push(recipe.toPlainText(includeNotes));
        });

        return textContent.join('');
    }

    getSortOn() {
        return this.sortOn;
    }

    setSortOn(sortOn) {
        this.sortOn = sortOn;
    }

    getCurrentRecipe() {
        return this.currentRecipe;
    }

    setCurrentRecipe(currentRecipe) {
        this.currentRecipe = currentRecipe;
    }

}

const ADD = 0;
const REPLACE = 1;
const MERGE = 3;


function importRecipes(mode)
{
    let fileInput = document.getElementById('file-input');
    fileInput.value = '';
    fileInput.onchange = function(e)
    {
        let file = e.target.files[0];
        if (file)
        {
            let reader = new FileReader();
            reader.onload = function(evt)
            {
                let text = evt.target.result;
                importTextRecipes(text,mode);
            };
            reader.readAsText(file);
        }
    };
    fileInput.click();
}

function importFile()
{
    showModal("Import Recipes", "Add to existing recipes, Replace existing recipes, or Merge with existing recipes?",
    [
    {
        text: "ADD",
        onClick: () =>
        {
            importRecipes(ADD)
        }
    },
    {
        text: "REPLACE",
        onClick: () =>
        {
            importRecipes(REPLACE)
        }
    },
    {
        text: "MERGE",
        onClick: () =>
        {
            importRecipes(MERGE)
        }
    }
   ]);
}


function importTextRecipes(text,mode)
{
    let recipes = [];
    let recipesText = text.split("\n");
    let recipeText = "";
    for (let s in recipesText)
    {
        line = recipesText[s];
        if (line.startsWith(RECIPE_BREAK_DETECT))
        {
            let recipe = parseRecipe(recipeText,true);
            recipes.push(recipe);
            recipeText = "";
        } else
        {
            recipeText += line + "\n";
        }
    }
    if(mode==REPLACE)
    {
        Recipes.getInstance().list=[];
        idMap = new Map();
    }
    for(let i in recipes)
    {
        let newRecipe = recipes[i];
        if(mode==MERGE)
        {
            let found=false;
            for(let j in Recipes.getInstance().list)
            {
                let oldRecipe=Recipes.getInstance().list[j]
                if(oldRecipe.toPlainText()==newRecipe.toPlainText()) found=true;
            }
            if(!found)
            {
                Recipes.getInstance().list.push(newRecipe);
            }
        }
        else
        {
            Recipes.getInstance().list.push(newRecipe);
        }
    }
    Recipes.getInstance().save();
    refresh();
}

function parseRecipe(text,verbatim)
{
    let recipe = new Recipe();
    let parser = new RecipeParser();
    parser.setRawText(text, verbatim);
    recipe.setTitle(parser.getTitle());
    recipe.setServings(parser.getServings());
    recipe.isMetric=parser.isMetric;
    recipe.setIngredients(parser.getIngredients());
    recipe.setDirections(parser.getDirections());
    recipe.setNotes(parser.getNotes());

    return recipe;
}


// export recipes
function exportRecipes()
{
    var data = Recipes.getInstance().toPlainText(true);
    var currentTime = new Date();
    var ts = currentTime.getFullYear().toString() +
        String(currentTime.getMonth() + 1).padStart(2, '0') +
        String(currentTime.getDate()).padStart(2, '0') +
        "_" +
        String(currentTime.getHours()).padStart(2, '0') +
        String(currentTime.getMinutes()).padStart(2, '0') +
        String(currentTime.getSeconds()).padStart(2, '0');
    var filename = "RECIPES_" + ts + ".txt";
    var blob = new Blob([data],
    {
        type: 'application/txt'
    });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showModal("Export", "Recipes saved to "+filename,
    [
    {
        text: "OK"
    }]);
}

//add a recipe to the list
function addRecipeToList(recipe)
{
    const recipeList = document.getElementById('recipe-list');
    const item = document.createElement('div');
    item.className = 'recipe-item';
    // Description
    const desc = document.createElement('span');
    desc.className = 'recipe-desc';
    desc.textContent = recipe.title;
    // Hidden UUID
    const hidden = document.createElement('span');
    hidden.className = 'id-field';
    hidden.textContent = getRecipeId(recipe);
    item.appendChild(desc);
    item.appendChild(hidden);
    item.title="View the recipe for "+recipe.title;
    item.onclick = function() {
        viewRecipe(hidden.textContent);
    };
    // Add to list
    recipeList.appendChild(item);
}

function increaseServings()
{
    convertedRecipe.servings=parseInt(convertedRecipe.servings)+1;
    convertRecipe();
    loadViewScreen(convertedRecipe);
}

function decreaseServings()
{
    let s=parseInt(convertedRecipe.servings);
    if(s>1)
    {
        convertedRecipe.servings=s-1;
        convertRecipe();
        loadViewScreen(convertedRecipe);
    }
}

function toggleUnits()
{
    let unitsBtn=document.getElementById("unitsBtn");
    let isMetric=unitsBtn.textContent=="Metric";
    isMetric=!isMetric;
    convertedRecipe.isMetric=isMetric;
    unitsBtn.textContent=isMetric?"Metric":"Imperial";
    convertRecipe();
    loadViewScreen(convertedRecipe);
}

function convertRecipe()
{
    if(currentRecipe.servings==convertedRecipe.servings && currentRecipe.isMetric==convertedRecipe.isMetric)
    {
        convertedRecipe=new Recipe(currentRecipe);
    }
    else
    {
        let ingredientArray = currentRecipe.ingredients.split("\n");
        let ingredients = ""
        for (let i=0;i<ingredientArray.length;i++)
        {
            ingredients+=(new UnitsConverter().convert(ingredientArray[i], currentRecipe.servings, convertedRecipe.servings,
                    currentRecipe.isMetric ? UnitsConverter.METRIC : UnitsConverter.IMPERIAL,
                    convertedRecipe.isMetric ? UnitsConverter.METRIC : UnitsConverter.IMPERIAL, true))+((i==ingredientArray.length-1)?"":"\n");
        }
        convertedRecipe.ingredients=ingredients;
        let directions = new UnitsConverter().convertDirections(currentRecipe.directions, currentRecipe.servings, convertedRecipe.servings,
        currentRecipe.isMetric ? UnitsConverter.METRIC : UnitsConverter.IMPERIAL,
        convertedRecipe.isMetric ? UnitsConverter.METRIC : UnitsConverter.IMPERIAL, currentRecipe.getExcludedPhrases()) + "\n";
        convertedRecipe.directions=directions;
    }
}

function viewRecipe(id)
{
    currentRecipe=getRecipeById(id);
    convertedRecipe=new Recipe(currentRecipe);
    loadViewScreen(currentRecipe);
    currentScreen=VIEW_SCREEN;
    refresh();
}

function cancelEdit()
{
    loadViewScreen(currentRecipe);
    currentScreen=VIEW_SCREEN;
    refresh();
}

function saveRecipe()
{
    let title=document.getElementById("recipe-name");
    let servings=document.getElementById("recipe-servings");
    let units=document.getElementById("add-units-btn");
    let ingredients=document.getElementById("add-ingredients");
    let directions=document.getElementById("add-directions");
    let notes=document.getElementById("add-notes");
    currentRecipe.title=title.value;
    currentRecipe.servings=servings.value;
    currentRecipe.isMetric=(units.textContent=="Metric");
    currentRecipe.ingredients=ingredients.value;
    currentRecipe.directions=directions.value;
    currentRecipe.notes=notes.value;
    if(!Recipes.getInstance().list.includes(currentRecipe))
    {
        Recipes.getInstance().list.push(currentRecipe);
        getRecipeId(currentRecipe);
        Recipes.getInstance().save();
        home();
    }
    else
    {
        Recipes.getInstance().save();
        cancelEdit();
    }
}

function deleteRecipe()
{
    showModal("Delete", "Delete this recipe?",
    [
    {
        text: "YES",
        onClick: () =>
        {
            if(Recipes.getInstance().list.includes(currentRecipe))
            {
                idMap.delete(getRecipeId(currentRecipe));
                Recipes.getInstance().list.splice(Recipes.getInstance().list.indexOf(currentRecipe), 1);
                Recipes.getInstance().save();
                home();
            }
        }
    },
    {
        text: "NO"
    }]);
}

function addRecipe()
{
    currentRecipe=new Recipe();
    currentScreen=ADD_SCREEN;
    refresh();
}

function setScalablePhrases()
{
    currentScreen=PHRASE_SCREEN;
    refresh();
}

function loadViewScreen(recipe)
{
    let ro=document.getElementById("recipe-readonly");
    let h="";
    h+="<h3>"+recipe.title+"</h3>";
    h+="<b>Ingredients</b>\n";
    h+=recipe.ingredients;
    h+="\n<b>Directions</b>\n";
    d=recipe.directions.split("\n");
    for(let i in d)
    {
        let n=parseInt(i)+1;
        if(d[i]!="") h+=n+". "+d[i]+"\n\n";
    }
    if(recipe.notes.trim().length>0)
    {
        h+="<b>Notes</b>\n";
        h+=recipe.notes;
    }
    ro.innerHTML=h;
    let unitsBtn = document.getElementById("unitsBtn");
    unitsBtn.textContent = recipe.isMetric?"Metric":"Imperial";
    let servingsTxt = document.getElementById("view-servings");
    servingsTxt.textContent = recipe.servings;
}

function filterRecipes()
{
    Recipes.getInstance().setSortOn(Recipes.NAME);
    let searchValue=document.getElementById("searchField").value.toLowerCase();
    if(searchValue.includes(",")) Recipes.getInstance().setSortOn(Recipes.SCORE);
    let list=Recipes.getInstance().list;
    if(searchValue!="")
    {
        let ingr=searchValue.split(",");
        for(var i in list)
        {
            let recipe=list[i];
            if(!searchValue.includes(","))
            {
                if(recipe.toPlainText().toLowerCase().includes(searchValue))
                {
                    recipe.sortScore=1;
                }
                else
                {
                    recipe.sortScore=0;
                }
            }
            else
            {
                let score=0;
                let ingredients=recipe.ingredients.toLowerCase().split("\n");
                for(let j=0;j<ingr.length;j++)
                {
                    for(let k=0;k<ingredients.length;k++)
                    {
                        if(ingr[j].trim()!="" && ingredients[k].includes(ingr[j].trim())) score++;
                    }
                }
                recipe.sortScore=score;
            }
        }
    }
    else
    {
        for(var i in list)
        {
           list[i].sortScore=1;
        }
    }
    Recipes.getInstance().sort();
    document.getElementById('recipe-list').innerHTML = '';
    for (var i in list)
    {
        if(list[i].sortScore>0)addRecipeToList(list[i]);
    }
}


function getRecipePhrases()
{
    let phrases = new UnitsConverter().getPhrases(currentRecipe.directions);
    document.getElementById('phrase-list').innerHTML = '';
    for (var i in phrases)
    {
        addPhraseToList(phrases[i],i);
    }
}

function addPhraseToList(phrase,i)
{
    const phraseList = document.getElementById('phrase-list');
    const item = document.createElement('div');
    item.className = 'phrase-item';
    // checkbox
    const chkbx = document.createElement('input');
    chkbx.type = 'checkbox';
    chkbx.className = 'control-text';
    chkbx.id = 'phrase'+i;
    chkbx.value = i;
    if(isExcludedPhrase(phrase.phraseText)) chkbx.checked=true;
    const label = document.createElement('span');
    label.className = 'control-text';
    label.textContent = phrase.phraseContext;
    label.for = 'phrase'+i;
    item.appendChild(chkbx);
    item.appendChild(label);
    // Add to list
    phraseList.appendChild(item);
}

function savePhrases()
{
    let phrases = new UnitsConverter().getPhrases(currentRecipe.directions);
    currentRecipe.excludedPhrases=[];
    const items = document.querySelectorAll('.phrase-item');
    items.forEach(item =>
    {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked)
        {
            currentRecipe.excludedPhrases.push(phrases[parseInt(checkbox.value)]);
        }
    });
    Recipes.getInstance().save();
    editRecipe();
}

function cancelPhrase()
{
    editRecipe();
}

function isExcludedPhrase(phrase)
{
    let excludedPhrases = currentRecipe.getExcludedPhrases();
    if (currentRecipe.getExcludedPhrases() != null)
    {
        for (i in excludedPhrases)
        {
            let excludedPhrase = excludedPhrases[i];
            if (phrase==excludedPhrase.phraseText)
            {
                return true;
            }
        }
    }
    return false;
}

function home()
{
    currentScreen=MAIN_SCREEN;
    refresh();
}

function loadMain()
{
    filterRecipes();
    document.getElementById("main-screen").classList.add('active');
}

function loadPhrases()
{
    getRecipePhrases();
    document.getElementById("phrases-screen").classList.add('active');
}

function loadView()
{
    document.getElementById("view-screen").classList.add('active');
}

function loadAdd()
{
    document.getElementById("delete-btn").style.display = 'none';
    document.getElementById("magic-btn").style.display = 'none';
    document.getElementById("cancel-btn").style.display = 'none';
    document.getElementById("fill-btn").style.display = 'inline-block';
    document.getElementById("add-screen").classList.add('active');
    let title=document.getElementById("recipe-name");
    let servings=document.getElementById("recipe-servings");
    let units=document.getElementById("add-units-btn");
    let ingredients=document.getElementById("add-ingredients");
    let directions=document.getElementById("add-directions");
    let notes=document.getElementById("add-notes");
    title.value="";
    servings.value="";
    units.textContent="Imperial";
    ingredients.value="";
    directions.value="";
    notes.value="";
}

function editRecipe()
{
    currentScreen=EDIT_SCREEN;
    refresh();
}

function loadEdit()
{
    document.getElementById("delete-btn").style.display = 'inline-block';
    document.getElementById("magic-btn").style.display = 'none';
    document.getElementById("cancel-btn").style.display = 'inline-block';
    document.getElementById("fill-btn").style.display = 'none';
    document.getElementById("add-screen").classList.add('active');
    let title=document.getElementById("recipe-name");
    let servings=document.getElementById("recipe-servings");
    let units=document.getElementById("add-units-btn");
    let ingredients=document.getElementById("add-ingredients");
    let directions=document.getElementById("add-directions");
    let notes=document.getElementById("add-notes");
    let phrases = new UnitsConverter().getPhrases(currentRecipe.directions);
    if(phrases.length>0) document.getElementById("magic-btn").style.display = 'inline-block';
    title.value=currentRecipe.title;
    servings.value=currentRecipe.servings;
    units.textContent=currentRecipe.isMetric?"Metric":"Imperial";
    ingredients.value=currentRecipe.ingredients;
    directions.value=currentRecipe.directions;
    notes.value=currentRecipe.notes;
}

function fillFromClipboard()
{
    navigator.clipboard.readText()
    .then(text => {
        parseAndFill(text);
    })
    .catch(err => {
        console.error('Failed to read clipboard contents: ', err);
    });
}

function parseAndFill(text)
{
    let p = new RecipeParser();
    p.setRawText(text, false);
    let title=document.getElementById("recipe-name");
    let servings=document.getElementById("recipe-servings");
    let units=document.getElementById("add-units-btn");
    let ingredients=document.getElementById("add-ingredients");
    let directions=document.getElementById("add-directions");
    let notes=document.getElementById("add-notes");
    title.value=p.title;
    servings.value=p.servings;
    units.textContent=p.isMetric?"Metric":"Imperial";
    ingredients.value=p.ingredients;
    directions.value=p.directions;
    notes.value=p.notes;
}


function toggleAddUnits()
{
    let units=document.getElementById("add-units-btn");
    let isMetric = !(units.textContent=="Metric");
    units.textContent=isMetric?"Metric":"Imperial";
}

function shareRecipes()
{
    showModal("Share", "Include notes with the recipes?",
    [
    {
        text: "YES",
        onClick: () =>
        {
            navigator.clipboard.writeText(Recipes.getInstance().toPlainText(true));
            showModal("Share", "Recipes copied to the clipboard.",
            [
            {
                text: "OK"
            }]);
        }
    },
    {
        text: "NO",
        onClick: () =>
        {
            navigator.clipboard.writeText(Recipes.getInstance().toPlainText(false));
            showModal("Share", "Recipes copied to the clipboard.",
            [
            {
                text: "OK"
            }]);
        }
    }]);
}

function shareRecipe()
{
    if(currentRecipe.notes.trim()=="")
    {
        navigator.clipboard.writeText(currentRecipe.toPlainText(true));
        showModal("Share", "Recipe copied to the clipboard.",
        [
        {
            text: "OK"
        }]);
    }
    else
    {
        showModal("Share", "Include notes with this recipe?",
        [
        {
            text: "YES",
            onClick: () =>
            {
                navigator.clipboard.writeText(currentRecipe.toPlainText(true));
                showModal("Share", "Recipe copied to the clipboard.",
                [
                {
                    text: "OK"
                }]);
            }
        },
        {
            text: "NO",
            onClick: () =>
            {
                navigator.clipboard.writeText(currentRecipe.toPlainText(false));
                showModal("Share", "Recipe copied to the clipboard.",
                [
                {
                    text: "OK"
                }]);
            }
        }
        ]);
    }
}




function refresh()
{
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    switch(currentScreen)
    {
        case MAIN_SCREEN:
            loadMain();
            break;
        case ADD_SCREEN:
            loadAdd();
            break;
        case EDIT_SCREEN:
            loadEdit();
            break;
        case VIEW_SCREEN:
            loadView();
            break;
        case PHRASE_SCREEN:
            loadPhrases();
            break;
    }
}



window.onload = function ()
{
    Recipes.getInstance().load();
    refresh();
}


