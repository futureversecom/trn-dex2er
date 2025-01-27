import SearchIcon from "@mui/icons-material/Search";

export const SearchBar = ({
	setSearchQuery,
	query,
}: {
	setSearchQuery: (e: string) => void;
	query: string;
}) => (
	<form>
		<input
			type="text"
			value={query}
			placeholder="Search Token"
			id={`search bar`} // edit this
			onChange={(e) => setSearchQuery(e.target.value)}
			className="text-md bg-transparent font-light text-neutral-700 focus:outline-none"
		/>
		<SearchIcon style={{ fill: "white" }} />
	</form>
);
