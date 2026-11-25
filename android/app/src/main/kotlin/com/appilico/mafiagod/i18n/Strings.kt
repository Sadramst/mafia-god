package com.appilico.mafiagod.i18n

import androidx.compose.runtime.compositionLocalOf

enum class AppLanguage { FA, EN }

/** fa/en pairs for every UI string, mirroring js/utils/i18n.js's {fa, en} structure but as a
 * flat key->pair map so screens can be built incrementally without a giant nested object graph.
 * Placeholders use %s/%d exactly like the web app, substituted positionally by [t]. */
object Strings {
    private val table: Map<String, Pair<String, String>> = mapOf(
        // common
        "common.confirm" to ("تایید" to "Confirm"),
        "common.cancel" to ("انصراف" to "Cancel"),
        "common.back" to ("بازگشت" to "Back"),
        "common.continue" to ("ادامه" to "Continue"),
        "common.close" to ("بستن" to "Close"),
        "common.skip" to ("رد کردن" to "Skip"),
        "common.confirmAndContinue" to ("تایید و ادامه" to "Confirm & Continue"),

        // app shell
        "app.name" to ("خدای مافیا" to "Mafia God"),
        "nav.home" to ("خانه" to "Home"),
        "nav.setup" to ("تنظیمات" to "Setup"),
        "nav.night" to ("شب" to "Night"),
        "nav.day" to ("روز" to "Day"),
        "nav.summary" to ("خلاصه" to "Summary"),

        // home
        "home.newGame" to ("بازی جدید" to "New Game"),
        "home.continueGame" to ("ادامه بازی" to "Continue Game"),
        "home.history" to ("تاریخچه" to "History"),
        "home.settings" to ("تنظیمات" to "Settings"),
        "home.tagline" to ("ابزار حرفه‌ای مدیریت بازی مافیا" to "Professional Mafia Game Management"),
        "home.noSave" to ("هیچ بازی ذخیره‌شده‌ای وجود ندارد" to "No saved game yet"),
        "home.newGameConfirmTitle" to ("شروع بازی جدید؟" to "Start a new game?"),
        "home.newGameConfirmBody" to ("بازی ذخیره‌شده فعلی حذف خواهد شد." to "Your current saved game will be deleted."),
        "home.emptyHistory" to ("هنوز بازی‌ای ثبت نشده" to "No games recorded yet"),
        "home.language" to ("زبان" to "Language"),
        "home.clearRoster" to ("پاک کردن لیست بازیکنان ذخیره‌شده" to "Clear saved roster"),

        // setup
        "setup.playersTab" to ("بازیکنان" to "Players"),
        "setup.rolesTab" to ("نقش‌ها" to "Roles"),
        "setup.assignTab" to ("تخصیص" to "Assign"),
        "setup.playersTitle" to ("افزودن بازیکنان" to "Add Players"),
        "setup.playersSubtitle" to ("حداقل ۸ بازیکن لازم است" to "At least 8 players required"),
        "setup.playerName" to ("نام بازیکن" to "Player name"),
        "setup.addButton" to ("افزودن" to "Add"),
        "setup.noPlayersYet" to ("هنوز بازیکنی اضافه نشده" to "No players added yet"),
        "setup.minPlayers" to ("حداقل %d بازیکن لازم است" to "At least %d players required"),
        "setup.selectRolesTitle" to ("انتخاب نقش‌ها" to "Select Roles"),
        "setup.playersLabel" to ("بازیکنان:" to "Players:"),
        "setup.selectedRolesLabel" to ("نقش‌های انتخابی:" to "Selected roles:"),
        "setup.shouldBe" to ("باید %d باشد" to "should be %d"),
        "setup.remainingRoles" to ("%d نقش باقی مانده" to "%d roles remaining"),
        "setup.teamMafia" to ("مافیا" to "Mafia"),
        "setup.teamCitizen" to ("شهروند" to "Citizen"),
        "setup.teamIndependent" to ("مستقل" to "Independent"),
        "setup.mafia" to ("مافیا" to "Mafia"),
        "setup.citizen" to ("شهروند" to "Citizen"),
        "setup.independent" to ("مستقل" to "Independent"),
        "setup.assignRolesTitle" to ("تخصیص نقش‌ها" to "Assign Roles"),
        "setup.noRoleSelected" to ("هیچ نقشی انتخاب نشده" to "No roles selected"),
        "setup.randomAssignAndStart" to ("تخصیص تصادفی و شروع" to "Random Assign & Start"),
        "setup.manualAssignAndStart" to ("تخصیص دستی و شروع" to "Manual Pick & Start"),
        "setup.orDivider" to ("یا" to "or"),
        "setup.backHome" to ("بازگشت به خانه" to "Back to Home"),
        "setup.roleInfoTooltip" to ("توضیحات نقش" to "Role info"),
        "setup.mustChooseMafia" to ("حداکثر %d نقش مافیا قابل انتخاب است" to "You can select at most %d mafia roles"),
        "setup.mustChooseCitizen" to ("حداکثر %d نقش شهروند قابل انتخاب است" to "You can select at most %d citizen roles"),
        "setup.bodyguardRequiresZodiacOrBomber" to ("محافظ فقط با زودیاک یا بمب‌گذار قابل انتخاب است" to "Bodyguard requires Zodiac or Bomber"),
        "setup.cannotRemoveBodyguardWhenZodiac" to ("تا زمانی که زودیاک یا بمب‌گذار انتخاب است، محافظ حذف نمی‌شود" to "Bodyguard can't be removed while Zodiac or Bomber is selected"),
        "setup.zodiacRequiresBodyguard" to ("زودیاک/بمب‌گذار نیازمند محافظ است — به‌صورت خودکار اضافه شد" to "Zodiac/Bomber requires Bodyguard — added automatically"),
        "setup.negotiatorRequiredForReporter" to ("خبرنگار نیازمند انتخاب مذاکره‌کننده است" to "Reporter requires Negotiator to be selected"),
        "setup.reporterRemovedWhenNegotiatorDeselected" to ("خبرنگار به‌دلیل حذف مذاکره‌کننده برداشته شد" to "Reporter removed since Negotiator was deselected"),
        "setup.gunnerBlankBullets" to ("مشقی" to "Blank"),
        "setup.gunnerLiveBullets" to ("جنگی" to "Live"),
        "setup.framasonAllies" to ("متحدان" to "Allies"),
        "setup.negotiatorThreshold" to ("آستانه" to "Threshold"),
        "setup.sniperShots" to ("تیرها" to "Shots"),
        "setup.zodiacSettings" to ("تنظیمات زودیاک" to "Zodiac Settings"),
        "setup.everyNight" to ("هر شب" to "Every night"),
        "setup.oddNights" to ("شب‌های فرد" to "Odd nights"),
        "setup.evenNights" to ("شب‌های زوج" to "Even nights"),
        "setup.drWatsonSettings" to ("حداکثر خوددرمانی دکتر واتسون" to "Dr. Watson max self-heals"),
        "setup.drLecterSettings" to ("حداکثر خوددرمانی دکتر لکتر" to "Dr. Lecter max self-heals"),
        "manualAssign.visibilityLabel" to ("نمایش نقش هنگام انتخاب:" to "Show roles while picking:"),
        "manualAssign.visibilityOn" to ("👁️ نمایان" to "👁️ Visible"),
        "manualAssign.visibilityOff" to ("🙈 پنهان" to "🙈 Hidden"),
        "manualAssign.pickPrompt" to ("یک نقش از باقی‌مانده‌ها انتخاب کن" to "Pick a role from what's left"),
        "manualAssign.blindPickPrompt" to ("یک کارت انتخاب کن — نقش بعد از انتخاب نمایش داده می‌شود" to "Pick a card — your role is revealed after you choose"),
        "manualAssign.confirmPrompt" to ("این نقش توست — تایید کن" to "This is your role — confirm it"),
        "manualAssign.pickDifferent" to ("انتخاب نقش دیگر" to "Pick a Different Role"),
        "manualAssign.mysteryCard" to ("کارت %d" to "Card %d"),
        "roleReveal.playerOfTotal" to ("بازیکن %d از %d" to "Player %d of %d"),
        "roleReveal.tapCard" to ("برای نمایش نقش لمس کن" to "Tap to Reveal"),
        "roleReveal.onlyPlayerShouldSee" to ("فقط %s باید این را ببیند" to "Only %s should see this"),
        "roleReveal.allRevealed" to ("همه نقش‌ها مشخص شد" to "All Roles Revealed"),
        "roleReveal.readyForBlindDay" to ("آماده شروع روز کور" to "Ready for the blind day"),
        "roleReveal.startBlindDay" to ("شروع روز کور" to "Start Blind Day"),
        "roleReveal.nextPlayer" to ("بازیکن بعدی" to "Next Player"),
        "roleReveal.startGame" to ("شروع بازی" to "Start Game"),

        // night
        "night.title" to ("شب" to "Night"),
        "night.blindTitle" to ("شب کور" to "Blind Night"),
        "night.roundLabel" to ("شب %d" to "Night %d"),
        "night.godDashboard" to ("داشبورد خدا" to "God Dashboard"),
        "night.resolveNight" to ("حل شب → رفتن به روز" to "Resolve Night → Go to Day"),
        "night.endBlindNight" to ("پایان شب کور" to "End Blind Night"),
        "night.selectTarget" to ("انتخاب هدف" to "Select a target"),
        "night.skip" to ("رد کردن" to "Skip"),
        "night.confirm" to ("تایید" to "Confirm"),
        "night.completed" to ("انجام شد" to "Completed"),
        "night.skipped" to ("رد شد" to "Skipped"),
        "night.mode.shoot" to ("شلیک" to "Shoot"),
        "night.mode.salakhi" to ("سلاخی" to "Salakhi"),
        "night.guessRole" to ("حدس نقش" to "Guess the exact role"),
        "night.bombPassword" to ("رمز بمب (۱ تا ۴)" to "Bomb password (1-4)"),
        "night.bulletBlank" to ("مشقی" to "Blank"),
        "night.bulletLive" to ("جنگی" to "Live"),
        "night.mafiaRevealPrompt" to ("اعضای مافیا یکدیگر را می‌شناسند" to "Mafia members recognize each other"),
        "night.acknowledge" to ("تایید" to "Acknowledge"),
        "night.kaneAlreadyUsed" to ("همشهری کین توانایی‌اش را استفاده کرده — بیداری نمایشی" to "Citizen Kane already used his ability — fake wake-up"),

        // day
        "day.title" to ("روز" to "Day"),
        "day.blindTitle" to ("روز کور" to "Blind Day"),
        "day.roundLabel" to ("روز %d" to "Day %d"),
        "day.resultsTab" to ("نتایج" to "Results"),
        "day.discussionTab" to ("بحث" to "Discussion"),
        "day.votingTab" to ("رأی‌گیری" to "Voting"),
        "day.startDiscussion" to ("شروع بحث" to "Start Discussion"),
        "day.startVoting" to ("شروع رأی‌گیری" to "Start Voting"),
        "day.endBlindDay" to ("پایان روز کور" to "End Blind Day"),
        "day.noKills" to ("کسی کشته نشد" to "No one was killed"),
        "day.killed" to ("کشته‌شدگان" to "Killed"),
        "day.godInfo" to ("اطلاعات محرمانه خدا" to "God-only info"),
        "day.continueToRunoff" to ("ادامه به دور دوم" to "Continue to Runoff"),
        "day.noElimination" to ("بدون حذف" to "No Elimination"),
        "day.executeRunoff" to ("اجرای دور دوم" to "Execute Runoff"),
        "day.cancelRunoff" to ("لغو دور دوم" to "Cancel Runoff"),
        "day.eliminate" to ("حذف" to "Eliminate"),
        "day.voteThreshold" to ("آستانه رأی: %d" to "Vote threshold: %d"),
        "day.cowboyDeclare" to ("من کابوی‌ام" to "I am Cowboy"),
        "day.morningShoot" to ("شلیک صبحگاهی" to "Morning Shot"),
        "day.dismiss" to ("باشه" to "Dismiss"),

        // summary
        "summary.winTitle.mafia" to ("مافیا برنده شد" to "Mafia Wins"),
        "summary.winTitle.citizen" to ("شهروندان برنده شدند" to "Citizens Win"),
        "summary.winTitle.independent" to ("مستقل برنده شد" to "Independent Wins"),
        "summary.newGame" to ("بازی جدید" to "New Game"),
        "summary.home" to ("خانه" to "Home"),
        "summary.backToGame" to ("بازگشت به بازی" to "Back to Game"),
        "summary.timeline" to ("خط زمانی رویدادها" to "Event Timeline"),
        "summary.roundLabel" to ("دور %d" to "Round %d"),
        "summary.aliveLabel" to ("زنده" to "Alive"),
        "summary.deadLabel" to ("مرده" to "Dead"),

        "teams.mafia" to ("مافیا" to "Mafia Team"),
        "teams.citizen" to ("شهروند" to "Citizen Team"),
        "teams.independent" to ("مستقل" to "Independent"),
    )

    fun get(key: String, fa: Boolean): String = table[key]?.let { if (fa) it.first else it.second } ?: key

    fun format(key: String, fa: Boolean, vararg args: String): String {
        var s = get(key, fa)
        for (a in args) s = s.replaceFirst(Regex("%[sd]"), a)
        return s
    }
}

val LocalLanguage = compositionLocalOf { AppLanguage.FA }
