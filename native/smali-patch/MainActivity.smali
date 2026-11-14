.class public Lcn/hanayomi/app/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"


# annotations
.annotation system Ldalvik/annotation/MemberClasses;
    value = {
        Lcn/hanayomi/app/MainActivity$Bridge;
    }
.end annotation


# static fields
.field private static final BACKGROUND:I = 0xc

.field private static final EXPORT:I = 0xb

.field private static final ICON_IMAGE:I = 0xd

.field private static final IMPORT:I = 0xa

.field private static final ORIGIN:Ljava/lang/String; = "https://appassets.androidplatform.net"


# instance fields
.field private final cancelled:Ljava/util/Set;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/Set<",
            "Ljava/lang/String;",
            ">;"
        }
    .end annotation
.end field

.field private insetBottom:I

.field private insetLeft:I

.field private insetRight:I

.field private insetTop:I

.field private keyboardHeight:I

.field private pageReady:Z

.field private pendingExport:Ljava/lang/String;

.field private pendingIntent:Landroid/content/Intent;

.field private final pool:Ljava/util/concurrent/ExecutorService;

.field private final requests:Ljava/util/concurrent/ConcurrentHashMap;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/concurrent/ConcurrentHashMap<",
            "Ljava/lang/String;",
            "Ljavax/net/ssl/HttpsURLConnection;",
            ">;"
        }
    .end annotation
.end field

.field private voicePlayer:Lcn/hanayomi/app/VoicePlayer;

.field private web:Landroid/webkit/WebView;


# direct methods
.method public constructor <init>()V
    .registers 2

    .line 36
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V

    .line 39
    const/4 v0, 0x0

    iput v0, p0, Lcn/hanayomi/app/MainActivity;->insetTop:I

    iput v0, p0, Lcn/hanayomi/app/MainActivity;->insetBottom:I

    iput v0, p0, Lcn/hanayomi/app/MainActivity;->insetLeft:I

    iput v0, p0, Lcn/hanayomi/app/MainActivity;->insetRight:I

    iput v0, p0, Lcn/hanayomi/app/MainActivity;->keyboardHeight:I

    .line 42
    iput-boolean v0, p0, Lcn/hanayomi/app/MainActivity;->pageReady:Z

    .line 44
    const-string v0, ""

    iput-object v0, p0, Lcn/hanayomi/app/MainActivity;->pendingExport:Ljava/lang/String;

    .line 45
    const/4 v0, 0x3

    invoke-static {v0}, Ljava/util/concurrent/Executors;->newFixedThreadPool(I)Ljava/util/concurrent/ExecutorService;

    move-result-object v0

    iput-object v0, p0, Lcn/hanayomi/app/MainActivity;->pool:Ljava/util/concurrent/ExecutorService;

    .line 46
    new-instance v0, Ljava/util/concurrent/ConcurrentHashMap;

    invoke-direct {v0}, Ljava/util/concurrent/ConcurrentHashMap;-><init>()V

    iput-object v0, p0, Lcn/hanayomi/app/MainActivity;->requests:Ljava/util/concurrent/ConcurrentHashMap;

    .line 47
    invoke-static {}, Ljava/util/concurrent/ConcurrentHashMap;->newKeySet()Ljava/util/concurrent/ConcurrentHashMap$KeySetView;

    move-result-object v0

    iput-object v0, p0, Lcn/hanayomi/app/MainActivity;->cancelled:Ljava/util/Set;

    .line 36
    return-void
.end method

.method static synthetic access$0(Lcn/hanayomi/app/MainActivity;Ljava/lang/String;Ljava/lang/Object;)V
    .registers 3

    .line 115
    invoke-direct {p0, p1, p2}, Lcn/hanayomi/app/MainActivity;->callback(Ljava/lang/String;Ljava/lang/Object;)V

    return-void
.end method

.method static synthetic access$1(Lcn/hanayomi/app/MainActivity;)Ljava/util/concurrent/ConcurrentHashMap;
    .registers 1

    .line 46
    iget-object p0, p0, Lcn/hanayomi/app/MainActivity;->requests:Ljava/util/concurrent/ConcurrentHashMap;

    return-object p0
.end method

.method static synthetic access$10(Lcn/hanayomi/app/MainActivity;Ljava/lang/String;)V
    .registers 2

    .line 44
    iput-object p1, p0, Lcn/hanayomi/app/MainActivity;->pendingExport:Ljava/lang/String;

    return-void
.end method

.method static synthetic access$11(Lcn/hanayomi/app/MainActivity;)Ljavax/crypto/SecretKey;
    .registers 1
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    .line 239
    invoke-direct {p0}, Lcn/hanayomi/app/MainActivity;->key()Ljavax/crypto/SecretKey;

    move-result-object p0

    return-object p0
.end method

.method static synthetic access$12(Lcn/hanayomi/app/MainActivity;)Ljava/lang/String;
    .registers 1
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    .line 247
    invoke-direct {p0}, Lcn/hanayomi/app/MainActivity;->getApiKey()Ljava/lang/String;

    move-result-object p0

    return-object p0
.end method

.method static synthetic access$13(Lcn/hanayomi/app/MainActivity;Ljava/lang/String;)Ljava/lang/String;
    .registers 2
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    .line 248
    invoke-direct {p0, p1}, Lcn/hanayomi/app/MainActivity;->getEncryptedKey(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p0

    return-object p0
.end method

.method static synthetic access$14(Lcn/hanayomi/app/MainActivity;)Lcn/hanayomi/app/VoicePlayer;
    .registers 1

    .line 41
    iget-object p0, p0, Lcn/hanayomi/app/MainActivity;->voicePlayer:Lcn/hanayomi/app/VoicePlayer;

    return-object p0
.end method

.method static synthetic access$15(Lcn/hanayomi/app/MainActivity;ILjava/lang/String;)Landroid/webkit/WebResourceResponse;
    .registers 3

    .line 112
    invoke-direct {p0, p1, p2}, Lcn/hanayomi/app/MainActivity;->response(ILjava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0
.end method

.method static synthetic access$16(Lcn/hanayomi/app/MainActivity;)V
    .registers 1

    .line 1
    invoke-super {p0}, Landroid/app/Activity;->onBackPressed()V

    return-void
.end method

.method static synthetic access$2(Lcn/hanayomi/app/MainActivity;)Ljava/util/Set;
    .registers 1

    .line 47
    iget-object p0, p0, Lcn/hanayomi/app/MainActivity;->cancelled:Ljava/util/Set;

    return-object p0
.end method

.method static synthetic access$3(Lcn/hanayomi/app/MainActivity;Ljava/io/InputStream;I)[B
    .registers 3
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/io/IOException;
        }
    .end annotation

    .line 223
    invoke-direct {p0, p1, p2}, Lcn/hanayomi/app/MainActivity;->readLimited(Ljava/io/InputStream;I)[B

    move-result-object p0

    return-object p0
.end method

.method static synthetic access$4(Lcn/hanayomi/app/MainActivity;Z)V
    .registers 2

    .line 42
    iput-boolean p1, p0, Lcn/hanayomi/app/MainActivity;->pageReady:Z

    return-void
.end method

.method static synthetic access$5(Lcn/hanayomi/app/MainActivity;)V
    .registers 1

    .line 139
    invoke-direct {p0}, Lcn/hanayomi/app/MainActivity;->sendInsets()V

    return-void
.end method

.method static synthetic access$6(Lcn/hanayomi/app/MainActivity;)Landroid/webkit/WebView;
    .registers 1

    .line 40
    iget-object p0, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    return-object p0
.end method

.method static synthetic access$7(Lcn/hanayomi/app/MainActivity;)V
    .registers 1

    .line 119
    invoke-direct {p0}, Lcn/hanayomi/app/MainActivity;->handleIntent()V

    return-void
.end method

.method static synthetic access$8(Lcn/hanayomi/app/MainActivity;I)V
    .registers 2

    .line 219
    invoke-direct {p0, p1}, Lcn/hanayomi/app/MainActivity;->pickImage(I)V

    return-void
.end method

.method static synthetic access$9(Lcn/hanayomi/app/MainActivity;)Ljava/util/concurrent/ExecutorService;
    .registers 1

    .line 45
    iget-object p0, p0, Lcn/hanayomi/app/MainActivity;->pool:Ljava/util/concurrent/ExecutorService;

    return-object p0
.end method

.method private callback(Ljava/lang/String;Ljava/lang/Object;)V
    .registers 4

    .line 116
    new-instance v0, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda3;

    invoke-direct {v0, p0, p1, p2}, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda3;-><init>(Lcn/hanayomi/app/MainActivity;Ljava/lang/String;Ljava/lang/Object;)V

    invoke-virtual {p0, v0}, Lcn/hanayomi/app/MainActivity;->runOnUiThread(Ljava/lang/Runnable;)V

    .line 117
    return-void
.end method

.method private compressImage(Landroid/graphics/Bitmap;)[B
    .registers 9
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/io/IOException;
        }
    .end annotation

    .line 210
    new-instance v0, Ljava/io/ByteArrayOutputStream;

    invoke-direct {v0}, Ljava/io/ByteArrayOutputStream;-><init>()V

    .line 211
    const/16 v1, 0x57

    const/4 v2, 0x0

    move-object v3, p1

    :goto_9
    const/16 v4, 0xc

    if-lt v2, v4, :cond_e

    goto :goto_22

    .line 212
    :cond_e
    invoke-virtual {v0}, Ljava/io/ByteArrayOutputStream;->reset()V

    sget-object v4, Landroid/graphics/Bitmap$CompressFormat;->JPEG:Landroid/graphics/Bitmap$CompressFormat;

    invoke-virtual {v3, v4, v1, v0}, Landroid/graphics/Bitmap;->compress(Landroid/graphics/Bitmap$CompressFormat;ILjava/io/OutputStream;)Z

    move-result v4

    if-eqz v4, :cond_5d

    .line 213
    invoke-virtual {v0}, Ljava/io/ByteArrayOutputStream;->size()I

    move-result v4

    const v5, 0x10c8e0

    if-gt v4, v5, :cond_2c

    .line 217
    :goto_22
    if-eq v3, p1, :cond_27

    invoke-virtual {v3}, Landroid/graphics/Bitmap;->recycle()V

    :cond_27
    invoke-virtual {v0}, Ljava/io/ByteArrayOutputStream;->toByteArray()[B

    move-result-object p1

    return-object p1

    .line 214
    :cond_2c
    const/16 v4, 0x3f

    if-le v1, v4, :cond_33

    add-int/lit8 v1, v1, -0x8

    goto :goto_5a

    .line 215
    :cond_33
    invoke-virtual {v3}, Landroid/graphics/Bitmap;->getWidth()I

    move-result v1

    mul-int/lit8 v1, v1, 0x3

    div-int/lit8 v1, v1, 0x4

    const/4 v4, 0x1

    invoke-static {v4, v1}, Ljava/lang/Math;->max(II)I

    move-result v1

    invoke-virtual {v3}, Landroid/graphics/Bitmap;->getHeight()I

    move-result v5

    mul-int/lit8 v5, v5, 0x3

    div-int/lit8 v5, v5, 0x4

    invoke-static {v4, v5}, Ljava/lang/Math;->max(II)I

    move-result v5

    invoke-static {v3, v1, v5, v4}, Landroid/graphics/Bitmap;->createScaledBitmap(Landroid/graphics/Bitmap;IIZ)Landroid/graphics/Bitmap;

    move-result-object v1

    if-eq v3, p1, :cond_55

    invoke-virtual {v3}, Landroid/graphics/Bitmap;->recycle()V

    :cond_55
    const/16 v3, 0x50

    move v6, v3

    move-object v3, v1

    move v1, v6

    .line 211
    :goto_5a
    add-int/lit8 v2, v2, 0x1

    goto :goto_9

    .line 212
    :cond_5d
    new-instance p1, Ljava/io/IOException;

    const-string v0, "\u56fe\u7247\u4fdd\u5b58\u5931\u8d25"

    invoke-direct {p1, v0}, Ljava/io/IOException;-><init>(Ljava/lang/String;)V

    throw p1
.end method

.method private configureSystemBars()V
    .registers 4

    .line 127
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v1, 0x1e

    const/4 v2, 0x0

    if-lt v0, v1, :cond_17

    .line 128
    invoke-virtual {p0}, Lcn/hanayomi/app/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object v0

    invoke-virtual {v0, v2}, Landroid/view/Window;->setDecorFitsSystemWindows(Z)V

    .line 129
    invoke-virtual {p0}, Lcn/hanayomi/app/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object v0

    const/16 v1, 0x30

    invoke-virtual {v0, v1}, Landroid/view/Window;->setSoftInputMode(I)V

    .line 131
    :cond_17
    invoke-virtual {p0}, Lcn/hanayomi/app/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object v0

    invoke-virtual {v0, v2}, Landroid/view/Window;->setStatusBarColor(I)V

    .line 132
    invoke-virtual {p0}, Lcn/hanayomi/app/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object v0

    invoke-virtual {v0, v2}, Landroid/view/Window;->setNavigationBarColor(I)V

    .line 133
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v1, 0x1c

    if-lt v0, v1, :cond_32

    invoke-virtual {p0}, Lcn/hanayomi/app/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object v0

    invoke-virtual {v0, v2}, Landroid/view/Window;->setNavigationBarDividerColor(I)V

    .line 134
    :cond_32
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v1, 0x1d

    if-lt v0, v1, :cond_46

    .line 135
    invoke-virtual {p0}, Lcn/hanayomi/app/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object v0

    invoke-virtual {v0, v2}, Landroid/view/Window;->setStatusBarContrastEnforced(Z)V

    invoke-virtual {p0}, Lcn/hanayomi/app/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object v0

    invoke-virtual {v0, v2}, Landroid/view/Window;->setNavigationBarContrastEnforced(Z)V

    .line 137
    :cond_46
    invoke-virtual {p0}, Lcn/hanayomi/app/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object v0

    invoke-virtual {v0}, Landroid/view/Window;->getDecorView()Landroid/view/View;

    move-result-object v0

    const/16 v1, 0x2710

    invoke-virtual {v0, v1}, Landroid/view/View;->setSystemUiVisibility(I)V

    .line 138
    return-void
.end method

.method private decodeImage(Landroid/net/Uri;I)Landroid/graphics/Bitmap;
    .registers 5
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/io/IOException;
        }
    .end annotation

    .line 171
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v1, 0x1c

    if-lt v0, v1, :cond_1e

    .line 173
    :try_start_6
    invoke-virtual {p0}, Lcn/hanayomi/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object v0

    invoke-static {v0, p1}, Landroid/graphics/ImageDecoder;->createSource(Landroid/content/ContentResolver;Landroid/net/Uri;)Landroid/graphics/ImageDecoder$Source;

    move-result-object v0

    new-instance v1, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda1;

    invoke-direct {v1, p2}, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda1;-><init>(I)V

    invoke-static {v0, v1}, Landroid/graphics/ImageDecoder;->decodeBitmap(Landroid/graphics/ImageDecoder$Source;Landroid/graphics/ImageDecoder$OnHeaderDecodedListener;)Landroid/graphics/Bitmap;

    move-result-object p1
    :try_end_17
    .catch Ljava/io/IOException; {:try_start_6 .. :try_end_17} :catch_18

    return-object p1

    .line 180
    :catch_18
    move-exception v0

    invoke-direct {p0, p1, p2}, Lcn/hanayomi/app/MainActivity;->decodeSampled(Landroid/net/Uri;I)Landroid/graphics/Bitmap;

    move-result-object p1

    return-object p1

    .line 182
    :cond_1e
    invoke-direct {p0, p1, p2}, Lcn/hanayomi/app/MainActivity;->decodeSampled(Landroid/net/Uri;I)Landroid/graphics/Bitmap;

    move-result-object p1

    return-object p1
.end method

.method private decodeSampled(Landroid/net/Uri;I)Landroid/graphics/Bitmap;
    .registers 13
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/io/IOException;
        }
    .end annotation

    .line 185
    new-instance v0, Landroid/graphics/BitmapFactory$Options;

    invoke-direct {v0}, Landroid/graphics/BitmapFactory$Options;-><init>()V

    const/4 v1, 0x1

    iput-boolean v1, v0, Landroid/graphics/BitmapFactory$Options;->inJustDecodeBounds:Z

    .line 186
    const/4 v2, 0x0

    :try_start_9
    invoke-virtual {p0}, Lcn/hanayomi/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object v3

    invoke-virtual {v3, p1}, Landroid/content/ContentResolver;->openInputStream(Landroid/net/Uri;)Ljava/io/InputStream;

    move-result-object v3
    :try_end_11
    .catchall {:try_start_9 .. :try_end_11} :catchall_f7

    :try_start_11
    invoke-static {v3, v2, v0}, Landroid/graphics/BitmapFactory;->decodeStream(Ljava/io/InputStream;Landroid/graphics/Rect;Landroid/graphics/BitmapFactory$Options;)Landroid/graphics/Bitmap;
    :try_end_14
    .catchall {:try_start_11 .. :try_end_14} :catchall_f0

    if-eqz v3, :cond_19

    :try_start_16
    invoke-virtual {v3}, Ljava/io/InputStream;->close()V
    :try_end_19
    .catchall {:try_start_16 .. :try_end_19} :catchall_f7

    .line 187
    :cond_19
    iget v3, v0, Landroid/graphics/BitmapFactory$Options;->outWidth:I

    if-lez v3, :cond_e8

    iget v3, v0, Landroid/graphics/BitmapFactory$Options;->outHeight:I

    if-lez v3, :cond_e8

    .line 188
    iput v1, v0, Landroid/graphics/BitmapFactory$Options;->inSampleSize:I

    :goto_23
    iget v3, v0, Landroid/graphics/BitmapFactory$Options;->outWidth:I

    iget v4, v0, Landroid/graphics/BitmapFactory$Options;->outHeight:I

    invoke-static {v3, v4}, Ljava/lang/Math;->max(II)I

    move-result v3

    iget v4, v0, Landroid/graphics/BitmapFactory$Options;->inSampleSize:I

    div-int/2addr v3, v4

    if-gt v3, p2, :cond_e0

    .line 189
    const/4 p2, 0x0

    iput-boolean p2, v0, Landroid/graphics/BitmapFactory$Options;->inJustDecodeBounds:Z

    sget-object p2, Landroid/graphics/Bitmap$Config;->RGB_565:Landroid/graphics/Bitmap$Config;

    iput-object p2, v0, Landroid/graphics/BitmapFactory$Options;->inPreferredConfig:Landroid/graphics/Bitmap$Config;

    .line 190
    :try_start_37
    invoke-virtual {p0}, Lcn/hanayomi/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object p2

    invoke-virtual {p2, p1}, Landroid/content/ContentResolver;->openInputStream(Landroid/net/Uri;)Ljava/io/InputStream;

    move-result-object p2
    :try_end_3f
    .catchall {:try_start_37 .. :try_end_3f} :catchall_d6

    :try_start_3f
    invoke-static {p2, v2, v0}, Landroid/graphics/BitmapFactory;->decodeStream(Ljava/io/InputStream;Landroid/graphics/Rect;Landroid/graphics/BitmapFactory$Options;)Landroid/graphics/Bitmap;

    move-result-object v0
    :try_end_43
    .catchall {:try_start_3f .. :try_end_43} :catchall_cf

    if-eqz p2, :cond_48

    :try_start_45
    invoke-virtual {p2}, Ljava/io/InputStream;->close()V
    :try_end_48
    .catchall {:try_start_45 .. :try_end_48} :catchall_d6

    .line 191
    :cond_48
    if-eqz v0, :cond_c7

    .line 192
    new-instance v8, Landroid/graphics/Matrix;

    invoke-direct {v8}, Landroid/graphics/Matrix;-><init>()V

    .line 193
    :try_start_4f
    invoke-virtual {p0}, Lcn/hanayomi/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object p2

    invoke-virtual {p2, p1}, Landroid/content/ContentResolver;->openInputStream(Landroid/net/Uri;)Ljava/io/InputStream;

    move-result-object p1
    :try_end_57
    .catchall {:try_start_4f .. :try_end_57} :catchall_9f

    .line 194
    :try_start_57
    new-instance p2, Landroid/media/ExifInterface;

    invoke-direct {p2, p1}, Landroid/media/ExifInterface;-><init>(Ljava/io/InputStream;)V

    const-string v3, "Orientation"

    invoke-virtual {p2, v3, v1}, Landroid/media/ExifInterface;->getAttributeInt(Ljava/lang/String;I)I

    move-result p2

    .line 195
    const/high16 v1, -0x3d4c0000    # -90.0f

    const/high16 v3, 0x42b40000    # 90.0f

    const/high16 v4, 0x3f800000    # 1.0f

    const/high16 v5, -0x40800000    # -1.0f

    packed-switch p2, :pswitch_data_102

    goto :goto_91

    .line 202
    :pswitch_6e
    invoke-virtual {v8, v1}, Landroid/graphics/Matrix;->setRotate(F)V

    goto :goto_91

    .line 201
    :pswitch_72
    invoke-virtual {v8, v1}, Landroid/graphics/Matrix;->setRotate(F)V

    invoke-virtual {v8, v5, v4}, Landroid/graphics/Matrix;->postScale(FF)Z

    goto :goto_91

    .line 200
    :pswitch_79
    invoke-virtual {v8, v3}, Landroid/graphics/Matrix;->setRotate(F)V

    goto :goto_91

    .line 199
    :pswitch_7d
    invoke-virtual {v8, v3}, Landroid/graphics/Matrix;->setRotate(F)V

    invoke-virtual {v8, v5, v4}, Landroid/graphics/Matrix;->postScale(FF)Z

    goto :goto_91

    .line 198
    :pswitch_84
    invoke-virtual {v8, v4, v5}, Landroid/graphics/Matrix;->setScale(FF)V

    goto :goto_91

    .line 197
    :pswitch_88
    const/high16 p2, 0x43340000    # 180.0f

    invoke-virtual {v8, p2}, Landroid/graphics/Matrix;->setRotate(F)V

    goto :goto_91

    .line 196
    :pswitch_8e
    invoke-virtual {v8, v5, v4}, Landroid/graphics/Matrix;->setScale(FF)V
    :try_end_91
    .catchall {:try_start_57 .. :try_end_91} :catchall_97

    .line 204
    :goto_91
    if-eqz p1, :cond_aa

    :try_start_93
    invoke-virtual {p1}, Ljava/io/InputStream;->close()V

    goto :goto_aa

    :catchall_97
    move-exception p2

    move-object v2, p2

    if-eqz p1, :cond_9e

    invoke-virtual {p1}, Ljava/io/InputStream;->close()V

    :cond_9e
    throw v2
    :try_end_9f
    .catchall {:try_start_93 .. :try_end_9f} :catchall_9f

    :catchall_9f
    move-exception p1

    if-eqz v2, :cond_a8

    if-eq v2, p1, :cond_a7

    :try_start_a4
    invoke-virtual {v2, p1}, Ljava/lang/Throwable;->addSuppressed(Ljava/lang/Throwable;)V

    :cond_a7
    move-object p1, v2

    :cond_a8
    throw p1
    :try_end_a9
    .catch Ljava/io/IOException; {:try_start_a4 .. :try_end_a9} :catch_a9

    :catch_a9
    move-exception p1

    .line 205
    :cond_aa
    :goto_aa
    invoke-virtual {v8}, Landroid/graphics/Matrix;->isIdentity()Z

    move-result p1

    if-nez p1, :cond_c6

    invoke-virtual {v0}, Landroid/graphics/Bitmap;->getWidth()I

    move-result v6

    invoke-virtual {v0}, Landroid/graphics/Bitmap;->getHeight()I

    move-result v7

    const/4 v9, 0x1

    const/4 v4, 0x0

    const/4 v5, 0x0

    move-object v3, v0

    invoke-static/range {v3 .. v9}, Landroid/graphics/Bitmap;->createBitmap(Landroid/graphics/Bitmap;IIIILandroid/graphics/Matrix;Z)Landroid/graphics/Bitmap;

    move-result-object p1

    if-eq p1, v0, :cond_c5

    invoke-virtual {v0}, Landroid/graphics/Bitmap;->recycle()V

    :cond_c5
    move-object v0, p1

    .line 206
    :cond_c6
    return-object v0

    .line 191
    :cond_c7
    new-instance p1, Ljava/io/IOException;

    const-string p2, "\u56fe\u7247\u89e3\u7801\u5931\u8d25"

    invoke-direct {p1, p2}, Ljava/io/IOException;-><init>(Ljava/lang/String;)V

    throw p1

    .line 190
    :catchall_cf
    move-exception v2

    if-eqz p2, :cond_d5

    :try_start_d2
    invoke-virtual {p2}, Ljava/io/InputStream;->close()V

    :cond_d5
    throw v2
    :try_end_d6
    .catchall {:try_start_d2 .. :try_end_d6} :catchall_d6

    :catchall_d6
    move-exception p1

    if-eqz v2, :cond_df

    if-eq v2, p1, :cond_de

    invoke-virtual {v2, p1}, Ljava/lang/Throwable;->addSuppressed(Ljava/lang/Throwable;)V

    :cond_de
    move-object p1, v2

    :cond_df
    throw p1

    .line 188
    :cond_e0
    iget v3, v0, Landroid/graphics/BitmapFactory$Options;->inSampleSize:I

    mul-int/lit8 v3, v3, 0x2

    iput v3, v0, Landroid/graphics/BitmapFactory$Options;->inSampleSize:I

    goto/16 :goto_23

    .line 187
    :cond_e8
    new-instance p1, Ljava/io/IOException;

    const-string p2, "\u8fd9\u5f20\u56fe\u7247\u683c\u5f0f\u65e0\u6cd5\u8bfb\u53d6\uff0c\u8bf7\u9009\u62e9 JPG\u3001PNG \u6216 WebP"

    invoke-direct {p1, p2}, Ljava/io/IOException;-><init>(Ljava/lang/String;)V

    throw p1

    .line 186
    :catchall_f0
    move-exception v2

    if-eqz v3, :cond_f6

    :try_start_f3
    invoke-virtual {v3}, Ljava/io/InputStream;->close()V

    :cond_f6
    throw v2
    :try_end_f7
    .catchall {:try_start_f3 .. :try_end_f7} :catchall_f7

    :catchall_f7
    move-exception p1

    if-eqz v2, :cond_100

    if-eq v2, p1, :cond_ff

    invoke-virtual {v2, p1}, Ljava/lang/Throwable;->addSuppressed(Ljava/lang/Throwable;)V

    :cond_ff
    move-object p1, v2

    :cond_100
    throw p1

    nop

    :pswitch_data_102
    .packed-switch 0x2
        :pswitch_8e
        :pswitch_88
        :pswitch_84
        :pswitch_7d
        :pswitch_79
        :pswitch_72
        :pswitch_6e
    .end packed-switch
.end method

.method private getApiKey()Ljava/lang/String;
    .registers 2
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    .line 247
    const-string v0, "api_key"

    invoke-direct {p0, v0}, Lcn/hanayomi/app/MainActivity;->getEncryptedKey(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    return-object v0
.end method

.method private getEncryptedKey(Ljava/lang/String;)Ljava/lang/String;
    .registers 8
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    .line 249
    const/4 v0, 0x0

    invoke-virtual {p0, v0}, Lcn/hanayomi/app/MainActivity;->getPreferences(I)Landroid/content/SharedPreferences;

    move-result-object v1

    const-string v2, ""

    invoke-interface {v1, p1, v2}, Landroid/content/SharedPreferences;->getString(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p1

    invoke-virtual {p1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_12

    return-object v2

    .line 250
    :cond_12
    const-string v1, ":"

    invoke-virtual {p1, v1}, Ljava/lang/String;->split(Ljava/lang/String;)[Ljava/lang/String;

    move-result-object p1

    const-string v1, "AES/GCM/NoPadding"

    invoke-static {v1}, Ljavax/crypto/Cipher;->getInstance(Ljava/lang/String;)Ljavax/crypto/Cipher;

    move-result-object v1

    invoke-direct {p0}, Lcn/hanayomi/app/MainActivity;->key()Ljavax/crypto/SecretKey;

    move-result-object v2

    new-instance v3, Ljavax/crypto/spec/GCMParameterSpec;

    aget-object v0, p1, v0

    const/4 v4, 0x2

    invoke-static {v0, v4}, Landroid/util/Base64;->decode(Ljava/lang/String;I)[B

    move-result-object v0

    const/16 v5, 0x80

    invoke-direct {v3, v5, v0}, Ljavax/crypto/spec/GCMParameterSpec;-><init>(I[B)V

    invoke-virtual {v1, v4, v2, v3}, Ljavax/crypto/Cipher;->init(ILjava/security/Key;Ljava/security/spec/AlgorithmParameterSpec;)V

    .line 251
    new-instance v0, Ljava/lang/String;

    const/4 v2, 0x1

    aget-object p1, p1, v2

    invoke-static {p1, v4}, Landroid/util/Base64;->decode(Ljava/lang/String;I)[B

    move-result-object p1

    invoke-virtual {v1, p1}, Ljavax/crypto/Cipher;->doFinal([B)[B

    move-result-object p1

    sget-object v1, Ljava/nio/charset/StandardCharsets;->UTF_8:Ljava/nio/charset/Charset;

    invoke-direct {v0, p1, v1}, Ljava/lang/String;-><init>([BLjava/nio/charset/Charset;)V

    return-object v0
.end method

.method private handleIntent()V
    .registers 5

    .line 120
    iget-object v0, p0, Lcn/hanayomi/app/MainActivity;->pendingIntent:Landroid/content/Intent;

    const/4 v1, 0x0

    iput-object v1, p0, Lcn/hanayomi/app/MainActivity;->pendingIntent:Landroid/content/Intent;

    .line 121
    if-eqz v0, :cond_38

    const-string v2, "android.intent.action.SEND"

    invoke-virtual {v0}, Landroid/content/Intent;->getAction()Ljava/lang/String;

    move-result-object v3

    invoke-virtual {v2, v3}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v2

    if-nez v2, :cond_14

    goto :goto_38

    .line 122
    :cond_14
    const-string v2, "android.intent.extra.STREAM"

    invoke-virtual {v0, v2}, Landroid/content/Intent;->getParcelableExtra(Ljava/lang/String;)Landroid/os/Parcelable;

    move-result-object v2

    check-cast v2, Landroid/net/Uri;

    .line 123
    if-eqz v2, :cond_22

    invoke-direct {p0, v2, v1}, Lcn/hanayomi/app/MainActivity;->importUri(Landroid/net/Uri;Landroid/view/DragAndDropPermissions;)V

    goto :goto_37

    .line 124
    :cond_22
    const-string v1, "android.intent.extra.TEXT"

    invoke-virtual {v0, v1}, Landroid/content/Intent;->getCharSequenceExtra(Ljava/lang/String;)Ljava/lang/CharSequence;

    move-result-object v2

    if-eqz v2, :cond_37

    invoke-virtual {v0, v1}, Landroid/content/Intent;->getCharSequenceExtra(Ljava/lang/String;)Ljava/lang/CharSequence;

    move-result-object v0

    invoke-interface {v0}, Ljava/lang/CharSequence;->toString()Ljava/lang/String;

    move-result-object v0

    const-string v1, "sharedText"

    invoke-direct {p0, v1, v0}, Lcn/hanayomi/app/MainActivity;->callback(Ljava/lang/String;Ljava/lang/Object;)V

    .line 125
    :cond_37
    :goto_37
    return-void

    .line 121
    :cond_38
    :goto_38
    return-void
.end method

.method private importUri(Landroid/net/Uri;Landroid/view/DragAndDropPermissions;)V
    .registers 4

    .line 143
    const/16 v0, 0xa

    invoke-direct {p0, p1, p2, v0}, Lcn/hanayomi/app/MainActivity;->importUri(Landroid/net/Uri;Landroid/view/DragAndDropPermissions;I)V

    return-void
.end method

.method private importUri(Landroid/net/Uri;Landroid/view/DragAndDropPermissions;I)V
    .registers 6

    .line 145
    iget-object v0, p0, Lcn/hanayomi/app/MainActivity;->pool:Ljava/util/concurrent/ExecutorService;

    new-instance v1, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda2;

    invoke-direct {v1, p0, p2, p1, p3}, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda2;-><init>(Lcn/hanayomi/app/MainActivity;Landroid/view/DragAndDropPermissions;Landroid/net/Uri;I)V

    invoke-interface {v0, v1}, Ljava/util/concurrent/ExecutorService;->submit(Ljava/lang/Runnable;)Ljava/util/concurrent/Future;

    .line 169
    return-void
.end method

.method private key()Ljavax/crypto/SecretKey;
    .registers 7
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    .line 240
    const-string v0, "AndroidKeyStore"

    invoke-static {v0}, Ljava/security/KeyStore;->getInstance(Ljava/lang/String;)Ljava/security/KeyStore;

    move-result-object v1

    const/4 v2, 0x0

    invoke-virtual {v1, v2}, Ljava/security/KeyStore;->load(Ljava/security/KeyStore$LoadStoreParameter;)V

    .line 241
    const-string v3, "hanayomi_api"

    invoke-virtual {v1, v3}, Ljava/security/KeyStore;->containsAlias(Ljava/lang/String;)Z

    move-result v4

    if-nez v4, :cond_3c

    .line 242
    const-string v4, "AES"

    invoke-static {v4, v0}, Ljavax/crypto/KeyGenerator;->getInstance(Ljava/lang/String;Ljava/lang/String;)Ljavax/crypto/KeyGenerator;

    move-result-object v0

    .line 243
    new-instance v4, Landroid/security/keystore/KeyGenParameterSpec$Builder;

    const/4 v5, 0x3

    invoke-direct {v4, v3, v5}, Landroid/security/keystore/KeyGenParameterSpec$Builder;-><init>(Ljava/lang/String;I)V

    const-string v5, "GCM"

    filled-new-array {v5}, [Ljava/lang/String;

    move-result-object v5

    invoke-virtual {v4, v5}, Landroid/security/keystore/KeyGenParameterSpec$Builder;->setBlockModes([Ljava/lang/String;)Landroid/security/keystore/KeyGenParameterSpec$Builder;

    move-result-object v4

    const-string v5, "NoPadding"

    filled-new-array {v5}, [Ljava/lang/String;

    move-result-object v5

    invoke-virtual {v4, v5}, Landroid/security/keystore/KeyGenParameterSpec$Builder;->setEncryptionPaddings([Ljava/lang/String;)Landroid/security/keystore/KeyGenParameterSpec$Builder;

    move-result-object v4

    invoke-virtual {v4}, Landroid/security/keystore/KeyGenParameterSpec$Builder;->build()Landroid/security/keystore/KeyGenParameterSpec;

    move-result-object v4

    invoke-virtual {v0, v4}, Ljavax/crypto/KeyGenerator;->init(Ljava/security/spec/AlgorithmParameterSpec;)V

    invoke-virtual {v0}, Ljavax/crypto/KeyGenerator;->generateKey()Ljavax/crypto/SecretKey;

    .line 245
    :cond_3c
    invoke-virtual {v1, v3, v2}, Ljava/security/KeyStore;->getEntry(Ljava/lang/String;Ljava/security/KeyStore$ProtectionParameter;)Ljava/security/KeyStore$Entry;

    move-result-object v0

    check-cast v0, Ljava/security/KeyStore$SecretKeyEntry;

    invoke-virtual {v0}, Ljava/security/KeyStore$SecretKeyEntry;->getSecretKey()Ljavax/crypto/SecretKey;

    move-result-object v0

    return-object v0
.end method

.method static synthetic lambda$6(ILandroid/graphics/ImageDecoder;Landroid/graphics/ImageDecoder$ImageInfo;Landroid/graphics/ImageDecoder$Source;)V
    .registers 5

    .line 174
    invoke-virtual {p2}, Landroid/graphics/ImageDecoder$ImageInfo;->getSize()Landroid/util/Size;

    move-result-object p3

    invoke-virtual {p3}, Landroid/util/Size;->getWidth()I

    move-result p3

    invoke-virtual {p2}, Landroid/graphics/ImageDecoder$ImageInfo;->getSize()Landroid/util/Size;

    move-result-object p2

    invoke-virtual {p2}, Landroid/util/Size;->getHeight()I

    move-result p2

    .line 175
    int-to-float p0, p0

    invoke-static {p3, p2}, Ljava/lang/Math;->max(II)I

    move-result v0

    int-to-float v0, v0

    div-float/2addr p0, v0

    const/high16 v0, 0x3f800000    # 1.0f

    invoke-static {v0, p0}, Ljava/lang/Math;->min(FF)F

    move-result p0

    .line 176
    int-to-float p3, p3

    mul-float/2addr p3, p0

    invoke-static {p3}, Ljava/lang/Math;->round(F)I

    move-result p3

    const/4 v0, 0x1

    invoke-static {v0, p3}, Ljava/lang/Math;->max(II)I

    move-result p3

    int-to-float p2, p2

    mul-float/2addr p2, p0

    invoke-static {p2}, Ljava/lang/Math;->round(F)I

    move-result p0

    invoke-static {v0, p0}, Ljava/lang/Math;->max(II)I

    move-result p0

    invoke-virtual {p1, p3, p0}, Landroid/graphics/ImageDecoder;->setTargetSize(II)V

    .line 177
    invoke-virtual {p1, v0}, Landroid/graphics/ImageDecoder;->setAllocator(I)V

    .line 178
    const/4 p0, 0x0

    invoke-virtual {p1, p0}, Landroid/graphics/ImageDecoder;->setMemorySizePolicy(I)V

    .line 179
    return-void
.end method

.method private pickImage(I)V
    .registers 3

    .line 220
    new-instance v0, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda0;

    invoke-direct {v0, p0, p1}, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda0;-><init>(Lcn/hanayomi/app/MainActivity;I)V

    invoke-virtual {p0, v0}, Lcn/hanayomi/app/MainActivity;->runOnUiThread(Ljava/lang/Runnable;)V

    .line 222
    return-void
.end method

.method private readLimited(Ljava/io/InputStream;I)[B
    .registers 9
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/io/IOException;
        }
    .end annotation

    .line 224
    new-instance v0, Ljava/io/ByteArrayOutputStream;

    invoke-direct {v0}, Ljava/io/ByteArrayOutputStream;-><init>()V

    const/16 v1, 0x2000

    new-array v1, v1, [B

    .line 225
    const/4 v2, 0x0

    move v3, v2

    :goto_b
    invoke-virtual {p1, v1}, Ljava/io/InputStream;->read([B)I

    move-result v4

    const/4 v5, -0x1

    if-ne v4, v5, :cond_17

    invoke-virtual {v0}, Ljava/io/ByteArrayOutputStream;->toByteArray()[B

    move-result-object p1

    return-object p1

    :cond_17
    add-int/2addr v3, v4

    if-gt v3, p2, :cond_1e

    invoke-virtual {v0, v1, v2, v4}, Ljava/io/ByteArrayOutputStream;->write([BII)V

    goto :goto_b

    :cond_1e
    new-instance p1, Ljava/io/IOException;

    const-string p2, "\u6587\u4ef6\u6216\u54cd\u5e94\u8d85\u8fc7\u5927\u5c0f\u9650\u5236"

    invoke-direct {p1, p2}, Ljava/io/IOException;-><init>(Ljava/lang/String;)V

    throw p1
.end method

.method private response(ILjava/lang/String;)Landroid/webkit/WebResourceResponse;
    .registers 11

    .line 113
    new-instance v7, Landroid/webkit/WebResourceResponse;

    new-instance v5, Ljava/util/HashMap;

    invoke-direct {v5}, Ljava/util/HashMap;-><init>()V

    new-instance v6, Ljava/io/ByteArrayInputStream;

    sget-object v0, Ljava/nio/charset/StandardCharsets;->UTF_8:Ljava/nio/charset/Charset;

    invoke-virtual {p2, v0}, Ljava/lang/String;->getBytes(Ljava/nio/charset/Charset;)[B

    move-result-object v0

    invoke-direct {v6, v0}, Ljava/io/ByteArrayInputStream;-><init>([B)V

    const-string v1, "text/plain"

    const-string v2, "UTF-8"

    move-object v0, v7

    move v3, p1

    move-object v4, p2

    invoke-direct/range {v0 .. v6}, Landroid/webkit/WebResourceResponse;-><init>(Ljava/lang/String;Ljava/lang/String;ILjava/lang/String;Ljava/util/Map;Ljava/io/InputStream;)V

    return-object v7
.end method

.method private sendInsets()V
    .registers 4

    .line 140
    iget-boolean v0, p0, Lcn/hanayomi/app/MainActivity;->pageReady:Z

    if-nez v0, :cond_5

    return-void

    .line 141
    :cond_5
    :try_start_5
    new-instance v0, Lorg/json/JSONObject;

    invoke-direct {v0}, Lorg/json/JSONObject;-><init>()V

    const-string v1, "top"

    iget v2, p0, Lcn/hanayomi/app/MainActivity;->insetTop:I

    invoke-virtual {v0, v1, v2}, Lorg/json/JSONObject;->put(Ljava/lang/String;I)Lorg/json/JSONObject;

    const-string v1, "bottom"

    iget v2, p0, Lcn/hanayomi/app/MainActivity;->insetBottom:I

    invoke-virtual {v0, v1, v2}, Lorg/json/JSONObject;->put(Ljava/lang/String;I)Lorg/json/JSONObject;

    const-string v1, "keyboard"

    iget v2, p0, Lcn/hanayomi/app/MainActivity;->keyboardHeight:I

    invoke-virtual {v0, v1, v2}, Lorg/json/JSONObject;->put(Ljava/lang/String;I)Lorg/json/JSONObject;

    const-string v1, "left"

    iget v2, p0, Lcn/hanayomi/app/MainActivity;->insetLeft:I

    invoke-virtual {v0, v1, v2}, Lorg/json/JSONObject;->put(Ljava/lang/String;I)Lorg/json/JSONObject;

    const-string v1, "right"

    iget v2, p0, Lcn/hanayomi/app/MainActivity;->insetRight:I

    invoke-virtual {v0, v1, v2}, Lorg/json/JSONObject;->put(Ljava/lang/String;I)Lorg/json/JSONObject;

    const-string v1, "insets"

    invoke-direct {p0, v1, v0}, Lcn/hanayomi/app/MainActivity;->callback(Ljava/lang/String;Ljava/lang/Object;)V
    :try_end_32
    .catch Ljava/lang/Exception; {:try_start_5 .. :try_end_32} :catch_33

    goto :goto_34

    :catch_33
    move-exception v0

    .line 142
    :goto_34
    return-void
.end method


# virtual methods
.method synthetic lambda$0$cn-hanayomi-app-MainActivity(Landroid/view/View;Landroid/view/DragEvent;)Z
    .registers 5

    .line 80
    invoke-virtual {p2}, Landroid/view/DragEvent;->getAction()I

    move-result p1

    const/4 v0, 0x1

    if-ne p1, v0, :cond_8

    return v0

    .line 81
    :cond_8
    invoke-virtual {p2}, Landroid/view/DragEvent;->getAction()I

    move-result p1

    const/4 v1, 0x3

    if-ne p1, v1, :cond_51

    .line 82
    invoke-virtual {p0, p2}, Lcn/hanayomi/app/MainActivity;->requestDragAndDropPermissions(Landroid/view/DragEvent;)Landroid/view/DragAndDropPermissions;

    move-result-object p1

    .line 83
    invoke-virtual {p2}, Landroid/view/DragEvent;->getClipData()Landroid/content/ClipData;

    move-result-object p2

    .line 84
    if-eqz p2, :cond_4b

    invoke-virtual {p2}, Landroid/content/ClipData;->getItemCount()I

    move-result v1

    if-lez v1, :cond_4b

    .line 85
    const/4 v1, 0x0

    invoke-virtual {p2, v1}, Landroid/content/ClipData;->getItemAt(I)Landroid/content/ClipData$Item;

    move-result-object p2

    .line 86
    invoke-virtual {p2}, Landroid/content/ClipData$Item;->getUri()Landroid/net/Uri;

    move-result-object v1

    if-eqz v1, :cond_32

    invoke-virtual {p2}, Landroid/content/ClipData$Item;->getUri()Landroid/net/Uri;

    move-result-object p2

    invoke-direct {p0, p2, p1}, Lcn/hanayomi/app/MainActivity;->importUri(Landroid/net/Uri;Landroid/view/DragAndDropPermissions;)V

    goto :goto_50

    .line 87
    :cond_32
    invoke-virtual {p2}, Landroid/content/ClipData$Item;->getText()Ljava/lang/CharSequence;

    move-result-object v1

    if-eqz v1, :cond_45

    invoke-virtual {p2}, Landroid/content/ClipData$Item;->getText()Ljava/lang/CharSequence;

    move-result-object p2

    invoke-interface {p2}, Ljava/lang/CharSequence;->toString()Ljava/lang/String;

    move-result-object p2

    const-string v1, "sharedText"

    invoke-direct {p0, v1, p2}, Lcn/hanayomi/app/MainActivity;->callback(Ljava/lang/String;Ljava/lang/Object;)V

    :cond_45
    if-eqz p1, :cond_50

    invoke-virtual {p1}, Landroid/view/DragAndDropPermissions;->release()V

    .line 88
    goto :goto_50

    :cond_4b
    if-eqz p1, :cond_50

    invoke-virtual {p1}, Landroid/view/DragAndDropPermissions;->release()V

    .line 89
    :cond_50
    :goto_50
    return v0

    .line 91
    :cond_51
    return v0
.end method

.method synthetic lambda$1$cn-hanayomi-app-MainActivity(Landroid/view/View;Landroid/view/WindowInsets;)Landroid/view/WindowInsets;
    .registers 6

    .line 95
    invoke-virtual {p0}, Lcn/hanayomi/app/MainActivity;->getResources()Landroid/content/res/Resources;

    move-result-object p1

    invoke-virtual {p1}, Landroid/content/res/Resources;->getDisplayMetrics()Landroid/util/DisplayMetrics;

    move-result-object p1

    iget p1, p1, Landroid/util/DisplayMetrics;->density:F

    .line 96
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v1, 0x1e

    const/4 v2, 0x0

    if-lt v0, v1, :cond_63

    .line 97
    invoke-static {}, Landroid/view/WindowInsets$Type;->systemBars()I

    move-result v0

    invoke-static {}, Landroid/view/WindowInsets$Type;->displayCutout()I

    move-result v1

    or-int/2addr v0, v1

    invoke-virtual {p2, v0}, Landroid/view/WindowInsets;->getInsets(I)Landroid/graphics/Insets;

    move-result-object v0

    .line 98
    iget v1, v0, Landroid/graphics/Insets;->top:I

    int-to-float v1, v1

    div-float/2addr v1, p1

    invoke-static {v1}, Ljava/lang/Math;->round(F)I

    move-result v1

    iput v1, p0, Lcn/hanayomi/app/MainActivity;->insetTop:I

    iget v1, v0, Landroid/graphics/Insets;->bottom:I

    int-to-float v1, v1

    div-float/2addr v1, p1

    invoke-static {v1}, Ljava/lang/Math;->round(F)I

    move-result v1

    iput v1, p0, Lcn/hanayomi/app/MainActivity;->insetBottom:I

    iget v1, v0, Landroid/graphics/Insets;->left:I

    int-to-float v1, v1

    div-float/2addr v1, p1

    invoke-static {v1}, Ljava/lang/Math;->round(F)I

    move-result v1

    iput v1, p0, Lcn/hanayomi/app/MainActivity;->insetLeft:I

    iget v0, v0, Landroid/graphics/Insets;->right:I

    int-to-float v0, v0

    div-float/2addr v0, p1

    invoke-static {v0}, Ljava/lang/Math;->round(F)I

    move-result v0

    iput v0, p0, Lcn/hanayomi/app/MainActivity;->insetRight:I

    .line 99
    invoke-static {}, Landroid/view/WindowInsets$Type;->ime()I

    move-result v0

    invoke-virtual {p2, v0}, Landroid/view/WindowInsets;->isVisible(I)Z

    move-result v0

    if-eqz v0, :cond_60

    invoke-static {}, Landroid/view/WindowInsets$Type;->ime()I

    move-result v0

    invoke-virtual {p2, v0}, Landroid/view/WindowInsets;->getInsets(I)Landroid/graphics/Insets;

    move-result-object v0

    iget v0, v0, Landroid/graphics/Insets;->bottom:I

    int-to-float v0, v0

    div-float/2addr v0, p1

    invoke-static {v0}, Ljava/lang/Math;->round(F)I

    move-result v2

    :cond_60
    iput v2, p0, Lcn/hanayomi/app/MainActivity;->keyboardHeight:I

    .line 100
    goto :goto_9a

    .line 101
    :cond_63
    invoke-virtual {p2}, Landroid/view/WindowInsets;->getSystemWindowInsetTop()I

    move-result v0

    int-to-float v0, v0

    div-float/2addr v0, p1

    invoke-static {v0}, Ljava/lang/Math;->round(F)I

    move-result v0

    iput v0, p0, Lcn/hanayomi/app/MainActivity;->insetTop:I

    invoke-virtual {p2}, Landroid/view/WindowInsets;->getSystemWindowInsetLeft()I

    move-result v0

    int-to-float v0, v0

    div-float/2addr v0, p1

    invoke-static {v0}, Ljava/lang/Math;->round(F)I

    move-result v0

    iput v0, p0, Lcn/hanayomi/app/MainActivity;->insetLeft:I

    invoke-virtual {p2}, Landroid/view/WindowInsets;->getSystemWindowInsetRight()I

    move-result v0

    int-to-float v0, v0

    div-float/2addr v0, p1

    invoke-static {v0}, Ljava/lang/Math;->round(F)I

    move-result v0

    iput v0, p0, Lcn/hanayomi/app/MainActivity;->insetRight:I

    .line 102
    invoke-virtual {p2}, Landroid/view/WindowInsets;->getSystemWindowInsetBottom()I

    move-result v0

    int-to-float v0, v0

    div-float/2addr v0, p1

    invoke-static {v0}, Ljava/lang/Math;->round(F)I

    move-result p1

    .line 103
    const/16 v0, 0x64

    if-le p1, v0, :cond_96

    move p1, v2

    :cond_96
    iput p1, p0, Lcn/hanayomi/app/MainActivity;->insetBottom:I

    iput v2, p0, Lcn/hanayomi/app/MainActivity;->keyboardHeight:I

    .line 105
    :goto_9a
    invoke-direct {p0}, Lcn/hanayomi/app/MainActivity;->sendInsets()V

    return-object p2
.end method

.method synthetic lambda$2$cn-hanayomi-app-MainActivity(Lorg/json/JSONObject;)V
    .registers 3

    .line 108
    const-string v0, "voice"

    invoke-direct {p0, v0, p1}, Lcn/hanayomi/app/MainActivity;->callback(Ljava/lang/String;Ljava/lang/Object;)V

    return-void
.end method

.method synthetic lambda$3$cn-hanayomi-app-MainActivity()Ljava/lang/String;
    .registers 2
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    .line 108
    const-string v0, "voice_key"

    invoke-direct {p0, v0}, Lcn/hanayomi/app/MainActivity;->getEncryptedKey(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    return-object v0
.end method

.method synthetic lambda$4$cn-hanayomi-app-MainActivity(Ljava/lang/String;Ljava/lang/Object;)V
    .registers 5

    .line 116
    iget-object v0, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    if-nez v0, :cond_5

    return-void

    :cond_5
    :try_start_5
    new-instance v0, Lorg/json/JSONObject;

    invoke-direct {v0}, Lorg/json/JSONObject;-><init>()V

    const-string v1, "type"

    invoke-virtual {v0, v1, p1}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;

    const-string p1, "data"

    invoke-virtual {v0, p1, p2}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;

    iget-object p1, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    new-instance p2, Ljava/lang/StringBuilder;

    const-string v1, "window.nativeEvent && window.nativeEvent("

    invoke-direct {p2, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0}, Lorg/json/JSONObject;->toString()Ljava/lang/String;

    move-result-object v0

    invoke-virtual {p2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object p2

    const-string v0, ")"

    invoke-virtual {p2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object p2

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p2

    const/4 v0, 0x0

    invoke-virtual {p1, p2, v0}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    :try_end_33
    .catch Ljava/lang/Exception; {:try_start_5 .. :try_end_33} :catch_34

    goto :goto_35

    :catch_34
    move-exception p1

    :goto_35
    return-void
.end method

.method synthetic lambda$5$cn-hanayomi-app-MainActivity(Landroid/view/DragAndDropPermissions;Landroid/net/Uri;I)V
    .registers 14

    .line 147
    const-string v0, "error"

    :try_start_2
    invoke-virtual {p0}, Lcn/hanayomi/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object v1

    invoke-virtual {v1, p2}, Landroid/content/ContentResolver;->getType(Landroid/net/Uri;)Ljava/lang/String;

    move-result-object v1

    .line 148
    const/16 v2, 0xc

    const/4 v3, 0x2

    const/16 v4, 0xd

    if-eq p3, v2, :cond_b9

    if-eq p3, v4, :cond_b9

    if-eqz v1, :cond_1f

    const-string v2, "image/"

    invoke-virtual {v1, v2}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v1

    if-eqz v1, :cond_1f

    goto/16 :goto_b9

    .line 158
    :cond_1f
    const-string p3, "\u5bfc\u5165\u7684\u6587\u6863.txt"
    :try_end_21
    .catch Ljava/lang/OutOfMemoryError; {:try_start_2 .. :try_end_21} :catch_140
    .catch Ljava/lang/Exception; {:try_start_2 .. :try_end_21} :catch_11d
    .catchall {:try_start_2 .. :try_end_21} :catchall_11b

    .line 159
    const/4 v1, 0x0

    :try_start_22
    invoke-virtual {p0}, Lcn/hanayomi/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object v4

    const/4 v8, 0x0

    const/4 v9, 0x0

    const/4 v6, 0x0

    const/4 v7, 0x0

    move-object v5, p2

    invoke-virtual/range {v4 .. v9}, Landroid/content/ContentResolver;->query(Landroid/net/Uri;[Ljava/lang/String;Ljava/lang/String;[Ljava/lang/String;Ljava/lang/String;)Landroid/database/Cursor;

    move-result-object v2
    :try_end_2f
    .catchall {:try_start_22 .. :try_end_2f} :catchall_af

    .line 160
    if-eqz v2, :cond_4c

    :try_start_31
    invoke-interface {v2}, Landroid/database/Cursor;->moveToFirst()Z

    move-result v4

    if-eqz v4, :cond_4c

    const-string v4, "_display_name"

    invoke-interface {v2, v4}, Landroid/database/Cursor;->getColumnIndex(Ljava/lang/String;)I

    move-result v4

    if-ltz v4, :cond_4c

    invoke-interface {v2, v4}, Landroid/database/Cursor;->getString(I)Ljava/lang/String;

    move-result-object p3
    :try_end_43
    .catchall {:try_start_31 .. :try_end_43} :catchall_44

    goto :goto_4c

    .line 161
    :catchall_44
    move-exception p2

    move-object v1, p2

    if-eqz v2, :cond_4b

    :try_start_48
    invoke-interface {v2}, Landroid/database/Cursor;->close()V

    :cond_4b
    throw v1

    :cond_4c
    :goto_4c
    if-eqz v2, :cond_51

    invoke-interface {v2}, Landroid/database/Cursor;->close()V
    :try_end_51
    .catchall {:try_start_48 .. :try_end_51} :catchall_af

    .line 163
    :cond_51
    :try_start_51
    invoke-virtual {p0}, Lcn/hanayomi/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object v2

    invoke-virtual {v2, p2}, Landroid/content/ContentResolver;->openInputStream(Landroid/net/Uri;)Ljava/io/InputStream;

    move-result-object p2
    :try_end_59
    .catchall {:try_start_51 .. :try_end_59} :catchall_a5

    if-eqz p2, :cond_97

    :try_start_5b
    sget-object v2, Ljava/util/Locale;->ROOT:Ljava/util/Locale;

    invoke-virtual {p3, v2}, Ljava/lang/String;->toLowerCase(Ljava/util/Locale;)Ljava/lang/String;

    move-result-object v2

    const-string v4, ".json"

    invoke-virtual {v2, v4}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v2

    if-eqz v2, :cond_6c

    const/high16 v2, 0x4000000

    goto :goto_6e

    :cond_6c
    const/high16 v2, 0x1400000

    :goto_6e
    invoke-direct {p0, p2, v2}, Lcn/hanayomi/app/MainActivity;->readLimited(Ljava/io/InputStream;I)[B

    move-result-object v2
    :try_end_72
    .catchall {:try_start_5b .. :try_end_72} :catchall_94

    if-eqz p2, :cond_77

    :try_start_74
    invoke-virtual {p2}, Ljava/io/InputStream;->close()V
    :try_end_77
    .catchall {:try_start_74 .. :try_end_77} :catchall_a5

    .line 164
    :cond_77
    :try_start_77
    new-instance p2, Lorg/json/JSONObject;

    invoke-direct {p2}, Lorg/json/JSONObject;-><init>()V

    const-string v1, "name"

    invoke-virtual {p2, v1, p3}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;

    const-string p3, "base64"

    invoke-static {v2, v3}, Landroid/util/Base64;->encodeToString([BI)Ljava/lang/String;

    move-result-object v1

    invoke-virtual {p2, p3, v1}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;

    const-string p3, "file"

    invoke-direct {p0, p3, p2}, Lcn/hanayomi/app/MainActivity;->callback(Ljava/lang/String;Ljava/lang/Object;)V
    :try_end_8f
    .catch Ljava/lang/OutOfMemoryError; {:try_start_77 .. :try_end_8f} :catch_140
    .catch Ljava/lang/Exception; {:try_start_77 .. :try_end_8f} :catch_11d
    .catchall {:try_start_77 .. :try_end_8f} :catchall_11b

    .line 165
    nop

    .line 167
    if-eqz p1, :cond_14b

    goto/16 :goto_148

    .line 163
    :catchall_94
    move-exception p3

    move-object v1, p3

    goto :goto_9f

    :cond_97
    :try_start_97
    new-instance p3, Ljava/io/IOException;

    const-string v1, "\u65e0\u6cd5\u8bfb\u53d6\u6b64\u6587\u4ef6"

    invoke-direct {p3, v1}, Ljava/io/IOException;-><init>(Ljava/lang/String;)V

    throw p3
    :try_end_9f
    .catchall {:try_start_97 .. :try_end_9f} :catchall_94

    :goto_9f
    if-eqz p2, :cond_a4

    :try_start_a1
    invoke-virtual {p2}, Ljava/io/InputStream;->close()V

    :cond_a4
    throw v1
    :try_end_a5
    .catchall {:try_start_a1 .. :try_end_a5} :catchall_a5

    :catchall_a5
    move-exception p2

    if-eqz v1, :cond_ae

    if-eq v1, p2, :cond_ad

    :try_start_aa
    invoke-virtual {v1, p2}, Ljava/lang/Throwable;->addSuppressed(Ljava/lang/Throwable;)V

    :cond_ad
    move-object p2, v1

    :cond_ae
    throw p2

    .line 161
    :catchall_af
    move-exception p2

    if-eqz v1, :cond_b8

    if-eq v1, p2, :cond_b7

    invoke-virtual {v1, p2}, Ljava/lang/Throwable;->addSuppressed(Ljava/lang/Throwable;)V

    :cond_b7
    move-object p2, v1

    :cond_b8
    throw p2

    .line 149
    :cond_b9
    :goto_b9
    const-string v1, "imageBusy"

    if-ne p3, v4, :cond_c0

    const-string v2, "icon"

    goto :goto_c2

    :cond_c0
    const-string v2, "background"

    :goto_c2
    invoke-direct {p0, v1, v2}, Lcn/hanayomi/app/MainActivity;->callback(Ljava/lang/String;Ljava/lang/Object;)V
    :try_end_c5
    .catch Ljava/lang/OutOfMemoryError; {:try_start_aa .. :try_end_c5} :catch_140
    .catch Ljava/lang/Exception; {:try_start_aa .. :try_end_c5} :catch_11d
    .catchall {:try_start_aa .. :try_end_c5} :catchall_11b

    .line 151
    if-ne p3, v4, :cond_ca

    const/16 v1, 0x500

    goto :goto_cc

    :cond_ca
    const/16 v1, 0x960

    :goto_cc
    :try_start_cc
    invoke-direct {p0, p2, v1}, Lcn/hanayomi/app/MainActivity;->decodeImage(Landroid/net/Uri;I)Landroid/graphics/Bitmap;

    move-result-object p2
    :try_end_d0
    .catch Ljava/lang/OutOfMemoryError; {:try_start_cc .. :try_end_d0} :catch_d1
    .catch Ljava/lang/Exception; {:try_start_cc .. :try_end_d0} :catch_11d
    .catchall {:try_start_cc .. :try_end_d0} :catchall_11b

    goto :goto_dd

    .line 152
    :catch_d1
    move-exception v1

    if-ne p3, v4, :cond_d7

    const/16 v1, 0x280

    goto :goto_d9

    :cond_d7
    const/16 v1, 0x4b0

    :goto_d9
    :try_start_d9
    invoke-direct {p0, p2, v1}, Lcn/hanayomi/app/MainActivity;->decodeSampled(Landroid/net/Uri;I)Landroid/graphics/Bitmap;

    move-result-object p2

    .line 153
    :goto_dd
    if-eqz p2, :cond_113

    .line 154
    invoke-direct {p0, p2}, Lcn/hanayomi/app/MainActivity;->compressImage(Landroid/graphics/Bitmap;)[B

    move-result-object v1

    invoke-virtual {p2}, Landroid/graphics/Bitmap;->recycle()V

    .line 155
    new-instance p2, Lorg/json/JSONObject;

    invoke-direct {p2}, Lorg/json/JSONObject;-><init>()V

    const-string v2, "dataUrl"

    new-instance v5, Ljava/lang/StringBuilder;

    const-string v6, "data:image/jpeg;base64,"

    invoke-direct {v5, v6}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-static {v1, v3}, Landroid/util/Base64;->encodeToString([BI)Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v5, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {p2, v2, v1}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;

    .line 156
    if-ne p3, v4, :cond_108

    const-string p3, "iconReady"

    goto :goto_10a

    :cond_108
    const-string p3, "backgroundReady"

    :goto_10a
    invoke-direct {p0, p3, p2}, Lcn/hanayomi/app/MainActivity;->callback(Ljava/lang/String;Ljava/lang/Object;)V
    :try_end_10d
    .catch Ljava/lang/OutOfMemoryError; {:try_start_d9 .. :try_end_10d} :catch_140
    .catch Ljava/lang/Exception; {:try_start_d9 .. :try_end_10d} :catch_11d
    .catchall {:try_start_d9 .. :try_end_10d} :catchall_11b

    .line 167
    if-eqz p1, :cond_112

    invoke-virtual {p1}, Landroid/view/DragAndDropPermissions;->release()V

    .line 156
    :cond_112
    return-void

    .line 153
    :cond_113
    :try_start_113
    new-instance p2, Ljava/io/IOException;

    const-string p3, "\u624b\u673a\u65e0\u6cd5\u89e3\u7801\u8fd9\u5f20\u56fe\u7247\uff0c\u8bf7\u6362\u6210 JPG\u3001PNG\u3001WebP \u6216\u7cfb\u7edf\u652f\u6301\u7684 HEIC \u56fe\u7247"

    invoke-direct {p2, p3}, Ljava/io/IOException;-><init>(Ljava/lang/String;)V

    throw p2
    :try_end_11b
    .catch Ljava/lang/OutOfMemoryError; {:try_start_113 .. :try_end_11b} :catch_140
    .catch Ljava/lang/Exception; {:try_start_113 .. :try_end_11b} :catch_11d
    .catchall {:try_start_113 .. :try_end_11b} :catchall_11b

    .line 167
    :catchall_11b
    move-exception p2

    goto :goto_14c

    .line 166
    :catch_11d
    move-exception p2

    :try_start_11e
    new-instance p3, Ljava/lang/StringBuilder;

    const-string v1, "\u5bfc\u5165\u5931\u8d25\uff1a"

    invoke-direct {p3, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p2}, Ljava/lang/Exception;->getMessage()Ljava/lang/String;

    move-result-object v1

    if-nez v1, :cond_12e

    const-string p2, "\u65e0\u6cd5\u6253\u5f00\u56fe\u7247\u6216\u6587\u6863"

    goto :goto_132

    :cond_12e
    invoke-virtual {p2}, Ljava/lang/Exception;->getMessage()Ljava/lang/String;

    move-result-object p2

    :goto_132
    invoke-virtual {p3, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object p2

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p2

    invoke-direct {p0, v0, p2}, Lcn/hanayomi/app/MainActivity;->callback(Ljava/lang/String;Ljava/lang/Object;)V

    .line 167
    if-eqz p1, :cond_14b

    goto :goto_148

    .line 165
    :catch_140
    move-exception p2

    const-string p2, "\u624b\u673a\u53ef\u7528\u5185\u5b58\u4e0d\u8db3\uff0c\u5173\u95ed\u5176\u4ed6\u5e94\u7528\u540e\u53ef\u91cd\u65b0\u5bfc\u5165\u56fe\u7247"

    invoke-direct {p0, v0, p2}, Lcn/hanayomi/app/MainActivity;->callback(Ljava/lang/String;Ljava/lang/Object;)V
    :try_end_146
    .catchall {:try_start_11e .. :try_end_146} :catchall_11b

    .line 167
    if-eqz p1, :cond_14b

    :goto_148
    invoke-virtual {p1}, Landroid/view/DragAndDropPermissions;->release()V

    .line 168
    :cond_14b
    return-void

    .line 167
    :goto_14c
    if-eqz p1, :cond_151

    invoke-virtual {p1}, Landroid/view/DragAndDropPermissions;->release()V

    :cond_151
    throw p2
.end method

.method synthetic lambda$7$cn-hanayomi-app-MainActivity(I)V
    .registers 5

    .line 220
    new-instance v0, Landroid/content/Intent;

    const-string v1, "android.intent.action.OPEN_DOCUMENT"

    invoke-direct {v0, v1}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V

    const-string v1, "android.intent.category.OPENABLE"

    invoke-virtual {v0, v1}, Landroid/content/Intent;->addCategory(Ljava/lang/String;)Landroid/content/Intent;

    const-string v1, "image/*"

    invoke-virtual {v0, v1}, Landroid/content/Intent;->setType(Ljava/lang/String;)Landroid/content/Intent;

    const/16 v1, 0xc

    if-ne p1, v1, :cond_1b

    const-string v1, "android.intent.extra.ALLOW_MULTIPLE"

    const/4 v2, 0x1

    invoke-virtual {v0, v1, v2}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Z)Landroid/content/Intent;

    .line 221
    :cond_1b
    :try_start_1b
    invoke-virtual {p0, v0, p1}, Lcn/hanayomi/app/MainActivity;->startActivityForResult(Landroid/content/Intent;I)V
    :try_end_1e
    .catch Ljava/lang/Exception; {:try_start_1b .. :try_end_1e} :catch_1f

    goto :goto_27

    :catch_1f
    move-exception p1

    const-string p1, "error"

    const-string v0, "\u7cfb\u7edf\u6ca1\u6709\u53ef\u7528\u7684\u76f8\u518c\u9009\u62e9\u5668"

    invoke-direct {p0, p1, v0}, Lcn/hanayomi/app/MainActivity;->callback(Ljava/lang/String;Ljava/lang/Object;)V

    :goto_27
    return-void
.end method

.method synthetic lambda$8$cn-hanayomi-app-MainActivity(Landroid/net/Uri;Ljava/lang/String;)V
    .registers 5

    .line 235
    const/4 v0, 0x0

    :try_start_1
    invoke-virtual {p0}, Lcn/hanayomi/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object v1

    invoke-virtual {v1, p1}, Landroid/content/ContentResolver;->openOutputStream(Landroid/net/Uri;)Ljava/io/OutputStream;

    move-result-object p1
    :try_end_9
    .catchall {:try_start_1 .. :try_end_9} :catchall_32

    if-eqz p1, :cond_24

    :try_start_b
    sget-object v1, Ljava/nio/charset/StandardCharsets;->UTF_8:Ljava/nio/charset/Charset;

    invoke-virtual {p2, v1}, Ljava/lang/String;->getBytes(Ljava/nio/charset/Charset;)[B

    move-result-object p2

    invoke-virtual {p1, p2}, Ljava/io/OutputStream;->write([B)V

    const-string p2, "toast"

    const-string v1, "\u6587\u4ef6\u5df2\u4fdd\u5b58"

    invoke-direct {p0, p2, v1}, Lcn/hanayomi/app/MainActivity;->callback(Ljava/lang/String;Ljava/lang/Object;)V
    :try_end_1b
    .catchall {:try_start_b .. :try_end_1b} :catchall_21

    if-eqz p1, :cond_55

    :try_start_1d
    invoke-virtual {p1}, Ljava/io/OutputStream;->close()V
    :try_end_20
    .catchall {:try_start_1d .. :try_end_20} :catchall_32

    goto :goto_55

    :catchall_21
    move-exception p2

    move-object v0, p2

    goto :goto_2c

    :cond_24
    :try_start_24
    new-instance p2, Ljava/io/IOException;

    const-string v0, "\u65e0\u6cd5\u6253\u5f00\u4fdd\u5b58\u4f4d\u7f6e"

    invoke-direct {p2, v0}, Ljava/io/IOException;-><init>(Ljava/lang/String;)V

    throw p2
    :try_end_2c
    .catchall {:try_start_24 .. :try_end_2c} :catchall_21

    :goto_2c
    if-eqz p1, :cond_31

    :try_start_2e
    invoke-virtual {p1}, Ljava/io/OutputStream;->close()V

    :cond_31
    throw v0
    :try_end_32
    .catchall {:try_start_2e .. :try_end_32} :catchall_32

    :catchall_32
    move-exception p1

    if-eqz v0, :cond_3b

    if-eq v0, p1, :cond_3a

    :try_start_37
    invoke-virtual {v0, p1}, Ljava/lang/Throwable;->addSuppressed(Ljava/lang/Throwable;)V

    :cond_3a
    move-object p1, v0

    :cond_3b
    throw p1
    :try_end_3c
    .catch Ljava/lang/Exception; {:try_start_37 .. :try_end_3c} :catch_3c

    .line 236
    :catch_3c
    move-exception p1

    new-instance p2, Ljava/lang/StringBuilder;

    const-string v0, "\u4fdd\u5b58\u5931\u8d25\uff1a"

    invoke-direct {p2, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Exception;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object p1

    invoke-virtual {p1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    const-string p2, "error"

    invoke-direct {p0, p2, p1}, Lcn/hanayomi/app/MainActivity;->callback(Ljava/lang/String;Ljava/lang/Object;)V

    .line 237
    :cond_55
    :goto_55
    return-void
.end method

.method synthetic lambda$9$cn-hanayomi-app-MainActivity(Ljava/lang/String;)V
    .registers 3

    .line 375
    const-string v0, "true"

    invoke-virtual {v0, p1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result p1

    if-nez p1, :cond_b

    # invokes: Landroid/app/Activity;->onBackPressed()V
    invoke-static {p0}, Lcn/hanayomi/app/MainActivity;->access$16(Lcn/hanayomi/app/MainActivity;)V

    :cond_b
    return-void
.end method

.method protected onActivityResult(IILandroid/content/Intent;)V
    .registers 8

    .line 228
    invoke-super {p0, p1, p2, p3}, Landroid/app/Activity;->onActivityResult(IILandroid/content/Intent;)V

    .line 229
    const/4 v0, -0x1

    const-string v1, ""

    const/16 v2, 0xb

    if-ne p2, v0, :cond_6e

    if-nez p3, :cond_d

    goto :goto_6e

    .line 230
    :cond_d
    const/16 v0, 0xe

    if-ne p1, v0, :cond_15

    invoke-static {p0, p3}, Lcn/hanayomi/app/FolderPick;->onResult(Lcn/hanayomi/app/MainActivity;Landroid/content/Intent;)V

    return-void

    :cond_15
    const/4 p2, 0x0

    const/16 v0, 0xc

    if-ne p1, v0, :cond_3a

    invoke-virtual {p3}, Landroid/content/Intent;->getClipData()Landroid/content/ClipData;

    move-result-object v3

    if-eqz v3, :cond_3a

    invoke-virtual {p3}, Landroid/content/Intent;->getClipData()Landroid/content/ClipData;

    move-result-object v3

    const/4 p1, 0x0

    :goto_25
    invoke-virtual {v3}, Landroid/content/ClipData;->getItemCount()I

    move-result p3

    if-lt p1, p3, :cond_2c

    return-void

    :cond_2c
    invoke-virtual {v3, p1}, Landroid/content/ClipData;->getItemAt(I)Landroid/content/ClipData$Item;

    move-result-object p3

    invoke-virtual {p3}, Landroid/content/ClipData$Item;->getUri()Landroid/net/Uri;

    move-result-object p3

    invoke-direct {p0, p3, p2, v0}, Lcn/hanayomi/app/MainActivity;->importUri(Landroid/net/Uri;Landroid/view/DragAndDropPermissions;I)V

    add-int/lit8 p1, p1, 0x1

    goto :goto_25

    .line 231
    :cond_3a
    invoke-virtual {p3}, Landroid/content/Intent;->getData()Landroid/net/Uri;

    move-result-object v3

    if-nez v3, :cond_41

    return-void

    .line 232
    :cond_41
    const/16 v3, 0xa

    if-ne p1, v3, :cond_4c

    invoke-virtual {p3}, Landroid/content/Intent;->getData()Landroid/net/Uri;

    move-result-object v3

    invoke-direct {p0, v3, p2}, Lcn/hanayomi/app/MainActivity;->importUri(Landroid/net/Uri;Landroid/view/DragAndDropPermissions;)V

    .line 233
    :cond_4c
    if-eq p1, v0, :cond_52

    const/16 v0, 0xd

    if-ne p1, v0, :cond_59

    :cond_52
    invoke-virtual {p3}, Landroid/content/Intent;->getData()Landroid/net/Uri;

    move-result-object v0

    invoke-direct {p0, v0, p2, p1}, Lcn/hanayomi/app/MainActivity;->importUri(Landroid/net/Uri;Landroid/view/DragAndDropPermissions;I)V

    .line 234
    :cond_59
    if-ne p1, v2, :cond_6d

    iget-object p1, p0, Lcn/hanayomi/app/MainActivity;->pendingExport:Ljava/lang/String;

    iput-object v1, p0, Lcn/hanayomi/app/MainActivity;->pendingExport:Ljava/lang/String;

    invoke-virtual {p3}, Landroid/content/Intent;->getData()Landroid/net/Uri;

    move-result-object p2

    iget-object p3, p0, Lcn/hanayomi/app/MainActivity;->pool:Ljava/util/concurrent/ExecutorService;

    new-instance v0, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda5;

    invoke-direct {v0, p0, p2, p1}, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda5;-><init>(Lcn/hanayomi/app/MainActivity;Landroid/net/Uri;Ljava/lang/String;)V

    invoke-interface {p3, v0}, Ljava/util/concurrent/ExecutorService;->submit(Ljava/lang/Runnable;)Ljava/util/concurrent/Future;

    .line 238
    :cond_6d
    return-void

    .line 229
    :cond_6e
    :goto_6e
    const/16 v0, 0xe

    if-ne p1, v0, :cond_75

    invoke-static {p0}, Lcn/hanayomi/app/FolderPick;->onCancel(Lcn/hanayomi/app/MainActivity;)V

    :cond_75
    if-ne p1, v2, :cond_79

    iput-object v1, p0, Lcn/hanayomi/app/MainActivity;->pendingExport:Ljava/lang/String;

    :cond_79
    return-void
.end method

.method public onBackPressed()V
    .registers 4

    .line 375
    iget-object v0, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    new-instance v1, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda4;

    invoke-direct {v1, p0}, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda4;-><init>(Lcn/hanayomi/app/MainActivity;)V

    const-string v2, "window.handleBack ? window.handleBack() : false"

    invoke-virtual {v0, v2, v1}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V

    return-void
.end method

.method public onCreate(Landroid/os/Bundle;)V
    .registers 6

    .line 50
    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    .line 51
    new-instance p1, Landroid/webkit/WebView;

    invoke-direct {p1, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V

    iput-object p1, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    .line 52
    const/4 p1, 0x0

    invoke-virtual {p0, p1}, Lcn/hanayomi/app/MainActivity;->getPreferences(I)Landroid/content/SharedPreferences;

    move-result-object v0

    const-string v1, "assets_version"

    invoke-interface {v0, v1, p1}, Landroid/content/SharedPreferences;->getInt(Ljava/lang/String;I)I

    move-result v0

    const/4 v2, 0x1

    const/4 v3, 0x3

    if-eq v0, v3, :cond_2d

    iget-object v0, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    invoke-virtual {v0, v2}, Landroid/webkit/WebView;->clearCache(Z)V

    invoke-virtual {p0, p1}, Lcn/hanayomi/app/MainActivity;->getPreferences(I)Landroid/content/SharedPreferences;

    move-result-object v0

    invoke-interface {v0}, Landroid/content/SharedPreferences;->edit()Landroid/content/SharedPreferences$Editor;

    move-result-object v0

    invoke-interface {v0, v1, v3}, Landroid/content/SharedPreferences$Editor;->putInt(Ljava/lang/String;I)Landroid/content/SharedPreferences$Editor;

    move-result-object v0

    invoke-interface {v0}, Landroid/content/SharedPreferences$Editor;->apply()V

    .line 53
    :cond_2d
    iget-object v0, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    invoke-virtual {v0, p1}, Landroid/webkit/WebView;->setBackgroundColor(I)V

    .line 54
    invoke-direct {p0}, Lcn/hanayomi/app/MainActivity;->configureSystemBars()V

    .line 55
    iget-object v0, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    invoke-virtual {v0}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;

    move-result-object v0

    .line 56
    invoke-virtual {v0, v2}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V

    invoke-virtual {v0, v2}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V

    .line 57
    invoke-virtual {v0, p1}, Landroid/webkit/WebSettings;->setAllowFileAccess(Z)V

    invoke-virtual {v0, p1}, Landroid/webkit/WebSettings;->setAllowContentAccess(Z)V

    .line 58
    invoke-virtual {v0, p1}, Landroid/webkit/WebSettings;->setAllowFileAccessFromFileURLs(Z)V

    invoke-virtual {v0, p1}, Landroid/webkit/WebSettings;->setAllowUniversalAccessFromFileURLs(Z)V

    .line 59
    invoke-virtual {v0, v2}, Landroid/webkit/WebSettings;->setMixedContentMode(I)V

    .line 60
    invoke-virtual {v0, p1}, Landroid/webkit/WebSettings;->setSupportZoom(Z)V

    const/16 p1, 0x64

    invoke-virtual {v0, p1}, Landroid/webkit/WebSettings;->setTextZoom(I)V

    .line 61
    iget-object p1, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    new-instance v0, Lcn/hanayomi/app/MainActivity$Bridge;

    invoke-direct {v0, p0}, Lcn/hanayomi/app/MainActivity$Bridge;-><init>(Lcn/hanayomi/app/MainActivity;)V

    const-string v1, "Android"

    invoke-virtual {p1, v0, v1}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V

    .line 62
    iget-object p1, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    new-instance v0, Lcn/hanayomi/app/MainActivity$1;

    invoke-direct {v0, p0}, Lcn/hanayomi/app/MainActivity$1;-><init>(Lcn/hanayomi/app/MainActivity;)V

    invoke-virtual {p1, v0}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V

    .line 78
    iget-object p1, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    new-instance v0, Landroid/webkit/WebChromeClient;

    invoke-direct {v0}, Landroid/webkit/WebChromeClient;-><init>()V

    invoke-virtual {p1, v0}, Landroid/webkit/WebView;->setWebChromeClient(Landroid/webkit/WebChromeClient;)V

    .line 79
    iget-object p1, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    new-instance v0, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda6;

    invoke-direct {v0, p0}, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda6;-><init>(Lcn/hanayomi/app/MainActivity;)V

    invoke-virtual {p1, v0}, Landroid/webkit/WebView;->setOnDragListener(Landroid/view/View$OnDragListener;)V

    .line 93
    iget-object p1, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    invoke-static {p0, p1}, Lcn/hanayomi/glass/GlassHost;->install(Landroid/app/Activity;Landroid/webkit/WebView;)V

    .line 94
    iget-object p1, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    new-instance v0, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda7;

    invoke-direct {v0, p0}, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda7;-><init>(Lcn/hanayomi/app/MainActivity;)V

    invoke-virtual {p1, v0}, Landroid/webkit/WebView;->setOnApplyWindowInsetsListener(Landroid/view/View$OnApplyWindowInsetsListener;)V

    .line 107
    iget-object p1, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    invoke-virtual {p1}, Landroid/webkit/WebView;->requestApplyInsets()V

    .line 108
    new-instance p1, Lcn/hanayomi/app/VoicePlayer;

    new-instance v0, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda8;

    invoke-direct {v0, p0}, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda8;-><init>(Lcn/hanayomi/app/MainActivity;)V

    new-instance v1, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda9;

    invoke-direct {v1, p0}, Lcn/hanayomi/app/MainActivity$$ExternalSyntheticLambda9;-><init>(Lcn/hanayomi/app/MainActivity;)V

    invoke-direct {p1, p0, v0, v1}, Lcn/hanayomi/app/VoicePlayer;-><init>(Landroid/app/Activity;Lcn/hanayomi/app/VoicePlayer$Events;Lcn/hanayomi/app/VoicePlayer$Secret;)V

    iput-object p1, p0, Lcn/hanayomi/app/MainActivity;->voicePlayer:Lcn/hanayomi/app/VoicePlayer;

    .line 109
    invoke-virtual {p0}, Lcn/hanayomi/app/MainActivity;->getIntent()Landroid/content/Intent;

    move-result-object p1

    iput-object p1, p0, Lcn/hanayomi/app/MainActivity;->pendingIntent:Landroid/content/Intent;

    .line 110
    iget-object p1, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    const-string v0, "https://appassets.androidplatform.net/assets/index.html"

    invoke-virtual {p1, v0}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V

    .line 111
    return-void
.end method

.method protected onDestroy()V
    .registers 3

    .line 377
    iget-object v0, p0, Lcn/hanayomi/app/MainActivity;->voicePlayer:Lcn/hanayomi/app/VoicePlayer;

    if-eqz v0, :cond_9

    iget-object v0, p0, Lcn/hanayomi/app/MainActivity;->voicePlayer:Lcn/hanayomi/app/VoicePlayer;

    invoke-virtual {v0}, Lcn/hanayomi/app/VoicePlayer;->close()V

    :cond_9
    iget-object v0, p0, Lcn/hanayomi/app/MainActivity;->requests:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v0}, Ljava/util/concurrent/ConcurrentHashMap;->values()Ljava/util/Collection;

    move-result-object v0

    invoke-interface {v0}, Ljava/util/Collection;->iterator()Ljava/util/Iterator;

    move-result-object v0

    :goto_13
    invoke-interface {v0}, Ljava/util/Iterator;->hasNext()Z

    move-result v1

    if-nez v1, :cond_35

    iget-object v0, p0, Lcn/hanayomi/app/MainActivity;->pool:Ljava/util/concurrent/ExecutorService;

    invoke-interface {v0}, Ljava/util/concurrent/ExecutorService;->shutdownNow()Ljava/util/List;

    iget-object v0, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    if-eqz v0, :cond_31

    iget-object v0, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    const-string v1, "Android"

    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->removeJavascriptInterface(Ljava/lang/String;)V

    iget-object v0, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    invoke-virtual {v0}, Landroid/webkit/WebView;->destroy()V

    const/4 v0, 0x0

    iput-object v0, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    :cond_31
    invoke-super {p0}, Landroid/app/Activity;->onDestroy()V

    return-void

    :cond_35
    invoke-interface {v0}, Ljava/util/Iterator;->next()Ljava/lang/Object;

    move-result-object v1

    check-cast v1, Ljavax/net/ssl/HttpsURLConnection;

    invoke-virtual {v1}, Ljavax/net/ssl/HttpsURLConnection;->disconnect()V

    goto :goto_13
.end method

.method protected onNewIntent(Landroid/content/Intent;)V
    .registers 2

    .line 118
    invoke-super {p0, p1}, Landroid/app/Activity;->onNewIntent(Landroid/content/Intent;)V

    iput-object p1, p0, Lcn/hanayomi/app/MainActivity;->pendingIntent:Landroid/content/Intent;

    iget-boolean p1, p0, Lcn/hanayomi/app/MainActivity;->pageReady:Z

    if-eqz p1, :cond_c

    invoke-direct {p0}, Lcn/hanayomi/app/MainActivity;->handleIntent()V

    :cond_c
    return-void
.end method

.method protected onPause()V
    .registers 4

    .line 376
    invoke-super {p0}, Landroid/app/Activity;->onPause()V

    iget-object v0, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    if-eqz v0, :cond_f

    iget-object v0, p0, Lcn/hanayomi/app/MainActivity;->web:Landroid/webkit/WebView;

    const-string v1, "window.persistReadingPosition && window.persistReadingPosition()"

    const/4 v2, 0x0

    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V

    :cond_f
    iget-object v0, p0, Lcn/hanayomi/app/MainActivity;->voicePlayer:Lcn/hanayomi/app/VoicePlayer;

    if-eqz v0, :cond_18

    iget-object v0, p0, Lcn/hanayomi/app/MainActivity;->voicePlayer:Lcn/hanayomi/app/VoicePlayer;

    invoke-virtual {v0}, Lcn/hanayomi/app/VoicePlayer;->stop()V

    :cond_18
    return-void
.end method
