import en from "../i18n/en.json";
import zhTW from "../i18n/zh-TW.json";
import zhCN from "../i18n/zh-CN.json";
import ja from "../i18n/ja.json";
import ko from "../i18n/ko.json";

export const LOCALES = {
  en,
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
};

export const SUPPORTED_LOCALES = Object.keys(LOCALES);

export function getStrings(locale) {
  return LOCALES[locale] || LOCALES.en;
}

export function getAllLanguageOptions() {
  return SUPPORTED_LOCALES.map((key) => ({
    key,
    name: LOCALES[key].languageName,
  }));
}
