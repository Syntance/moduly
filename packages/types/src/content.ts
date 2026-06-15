/** Identyfikator podstrony CMS — stabilny, definiowany w moduly.config. */
export type ContentPageId = string;

export type ContentBlockKey = string;

export type SeoMeta = {
	metaTitle?: string;
	metaDescription?: string;
	ogTitle?: string;
	ogDescription?: string;
	ogImageUrl?: string;
	canonicalUrl?: string;
	noIndex?: boolean;
	noFollow?: boolean;
};

export type AnnouncementBar = {
	enabled: boolean;
	text: string;
	link?: string;
};

export type TrustBar = {
	followers?: string;
	realizations?: string;
	shippingLabel?: string;
};

export type CheckoutCallout = {
	enabled?: boolean;
	title?: string;
	message?: string;
	confirmLabel?: string;
};

export type SocialLinks = {
	instagram?: string;
	facebook?: string;
	tiktok?: string;
};

export type SiteSettings = {
	title: string;
	description: string;
	announcementBar?: AnnouncementBar;
	trustBar?: TrustBar;
	checkoutCallout?: CheckoutCallout;
	socialLinks?: SocialLinks;
	footerText?: string;
	seo?: SeoMeta;
	titleTemplate?: string;
	defaultOgImageUrl?: string;
	googleSiteVerification?: string;
};

export type BrandingCtaContent = {
	/** Tło sekcji branding CTA (desktop). */
	desktopBackgroundUrl?: string;
	desktopBlurDataURL?: string;
};

export type HeroContent = {
	desktopImageUrl?: string;
	mobileImageUrl?: string;
	desktopBlurDataURL?: string;
	mobileBlurDataURL?: string;
	headline: string;
	subtitle?: string;
	description: string;
	ctaLabel: string;
	ctaHref: string;
	ctaAriaLabel?: string;
	headlineUppercase?: boolean;
	ctaShowDownArrow?: boolean;
};

export type CategoryTile = {
	title: string;
	cta: string;
	href: string;
	imageUrl: string;
	blurDataURL?: string;
};

export type Testimonial = {
	id: string;
	name: string;
	role?: string;
	company: string;
	quote: string;
	imageUrl?: string;
	rating: number;
	order: number;
};

export type FaqItem = {
	id: string;
	question: string;
	answer: string;
	order: number;
};

export type GalleryPhoto = {
	id: string;
	imageUrl: string;
	alt?: string;
	order: number;
};

/** Treść przypisana do pojedynczej podstrony CMS. */
export type PageContent = {
	hero?: HeroContent;
	brandingCta?: BrandingCtaContent;
	testimonials?: Testimonial[];
	faq?: FaqItem[];
	gallery?: GalleryPhoto[];
	categoryTiles?: CategoryTile[];
};

/** Bloki globalne współdzielone między podstronami. */
export type GlobalContent = {
	salonLogos?: SalonLogo[];
	instagramTiles?: InstagramTile[];
};

export type PageSeoMap = Partial<Record<ContentPageId, SeoMeta>>;
export type PageContentMap = Partial<Record<ContentPageId, PageContent>>;

export type ProductSeoMeta = SeoMeta;

export type ProductFaqItem = {
	id: string;
	question: string;
	answer: string;
	order: number;
};

export type SalonLogo = {
	id: string;
	name: string;
	logoUrl?: string;
	description?: string;
	alt?: string;
	order: number;
};

export type InstagramTile = {
	id: string;
	postUrl: string;
	imageUrl: string;
	alt?: string;
};
