import { SUPPORTED_LANG_VALUES, SupportedLang } from '@/helpers/constant';
import { Response } from 'express';

export const validateLanguage = (lang: string | undefined, res: Response): lang is SupportedLang => {
    if (!lang || !SUPPORTED_LANG_VALUES.includes(lang as SupportedLang)) {
        res.status(400).json({
            status: 'error',
            message: `Unsupported language: ${lang}`,
        });
        return false;
    }

    return true;
};
