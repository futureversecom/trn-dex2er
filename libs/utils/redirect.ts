const REDIRECT_KEY = "dexter::redirect";

export function saveRedirectLocation() {
	window.localStorage.setItem(REDIRECT_KEY, window.location.pathname);
}

export function getRedirectLocation() {
	const redirect = window.localStorage.getItem(REDIRECT_KEY) ?? "/";
	window.localStorage.removeItem(REDIRECT_KEY);

	return redirect;
}
