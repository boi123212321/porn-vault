import moment from "moment";

import { logger } from "./logger";

const EXTENSION_REGEX = /(\.[^/.\s]+)$/;

export function isHexColor(str: string): boolean {
  return /^#[a-f0-9]{6}$/i.test(str);
}

export function getExtension(file: string): string {
  return EXTENSION_REGEX.exec(file)?.[0] || "";
}

export function extensionFromUrl(url: string): string {
  const clean = url.split("?")[0].split("#")[0];
  return getExtension(clean) || "";
}

export function removeExtension(file: string): string {
  return file.replace(EXTENSION_REGEX, "");
}

/**
 * @param str - the string to strip
 * @returns the string without diacritics
 */
export const stripAccents = (str: string): string =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
 *
 * @param string - input string
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

// Parses the input to find a date. The date separator can be ".", " ", "-" or "/".
export const dateToTimestamp = (dateStr: string): number | null => {
  const ddmmyyyy = dateStr.match(
    /(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.]((?:19|20)\d\d)/
  );
  const yyyymmdd = dateStr.match(
    /((?:19|20)\d\d)[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])/
  );
  const yymmdd = dateStr.match(
    /\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])/
  );
  const mmyyyy = dateStr.match(
    /(0[1-9]|1[012])[- /.]((?:19|20)\d\d)/
  );
  const yyyymm = dateStr.match(
    /((?:19|20)\d\d)[- /.](0[1-9]|1[012])/
  );
  const yyyy = dateStr.match(
    /((?:19|20)\d\d)/
  );

  logger.verbose(`Converting date ${JSON.stringify(dateStr)} to timestamp`);

  if (yyyymmdd && yyyymmdd.length) {
    const date = yyyymmdd[0].replace(/[- /.]/g, "-");

    logger.verbose("\tSUCCESS: Found => yyyymmdd");

    return moment(date, "YYYY-MM-DD").valueOf();
  }
  if (ddmmyyyy && ddmmyyyy.length) {
    const date = ddmmyyyy[0].replace(/[- /.]/g, "-");

    logger.verbose("\tSUCCESS: Found => ddmmyyyy");

    return moment(date, "DD-MM-YYYY").valueOf();
  }
  if (yymmdd && yymmdd.length) {
    const date = yymmdd[0].replace(/[- /.]/g, "-");

    logger.verbose("\tSUCCESS: Found => yymmdd");

    return moment(date, "YY-MM-DD").valueOf();
  }
  if (mmyyyy && mmyyyy.length) {
    const date = mmyyyy[0].replace(/[- /.]/g, "-");

    logger.verbose("\tSUCCESS: Found => mmyyyy");

    return moment(date, "MM-YYYY").valueOf();
  }
  if (yyyymm && yyyymm.length) {
    const date = yyyymm[0].replace(/[- /.]/g, "-");

    logger.verbose("\tSUCCESS: Found => yyyymm");

    return moment(date, "YYYY-MM").valueOf();
  }
  if (yyyy && yyyy.length) {
    const date = yyyy[0];

    logger.verbose("\tSUCCESS: Found => yyyy");

    return moment(date, "YYYY").valueOf();
  }

  logger.verbose("\tFAILED: Could not find a date");
  return null;
};
