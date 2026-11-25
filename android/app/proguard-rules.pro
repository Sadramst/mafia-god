# Keep game model classes for kotlinx.serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class com.appilico.mafiagod.engine.** {
    *** Companion;
}
-keep,includedescriptorclasses class com.appilico.mafiagod.**$$serializer { *; }
-keepclassmembers class com.appilico.mafiagod.** {
    *** Companion;
}
-keepclasseswithmembers class com.appilico.mafiagod.** {
    kotlinx.serialization.KSerializer serializer(...);
}
