package com.appilico.mafiagod.i18n

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable

@Composable
@ReadOnlyComposable
fun t(key: String, vararg args: String): String {
    val lang = LocalLanguage.current
    return if (args.isEmpty()) Strings.get(key, lang == AppLanguage.FA) else Strings.format(key, lang == AppLanguage.FA, *args)
}

@Composable
@ReadOnlyComposable
fun isFa(): Boolean = LocalLanguage.current == AppLanguage.FA
