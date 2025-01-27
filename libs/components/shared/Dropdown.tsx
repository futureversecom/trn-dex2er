import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import classNames from "@sindresorhus/class-names";
import { useMemo } from "react";

import { Text } from "./";

type DropdownOption =
	| string
	| {
			value: string;
			element: JSX.Element;
	  };

interface DropdownProps {
	className?: string;
	itemsClassName?: string;
	current: string;
	anchor?: "bottom" | "bottom start";
	options: Array<DropdownOption>;
	onSelect: (option: string) => void;
}

function isOptionString(option: DropdownOption): option is string {
	return typeof option === "string";
}

function getOptionValue(option: DropdownOption) {
	return isOptionString(option) ? option : option.value;
}

function getOptionElement(option: DropdownOption) {
	return isOptionString(option) ? option : option.element;
}

function getCurrentElement(options: DropdownProps["options"], current: string) {
	const option = options.find((option) => getOptionValue(option) === current);

	return option ? getOptionElement(option) : current;
}

export function Dropdown({
	current,
	options,
	onSelect,
	className,
	itemsClassName,
	anchor = "bottom",
}: DropdownProps) {
	const isDisabled = useMemo(() => options.length <= 1, [options]);

	return (
		<Menu>
			<MenuButton
				disabled={isDisabled}
				className={classNames(
					className,
					"flex items-center justify-between rounded-lg bg-neutral-200"
				)}
			>
				{({ open }) => (
					<>
						<span className="text-lg">{getCurrentElement(options, current)}</span>
						{!isDisabled && (
							<svg
								width={16}
								height={8}
								className={classNames(
									"ml-2 text-neutral-700 transition duration-200",
									open && "rotate-180"
								)}
							>
								<use xlinkHref={`/images/commons.svg#chevron-down`} />
							</svg>
						)}
					</>
				)}
			</MenuButton>

			<MenuItems
				anchor={anchor}
				className={classNames(
					itemsClassName,
					"mt-1 space-y-1 rounded-md border border-neutral-600 bg-neutral-300"
				)}
			>
				{options.map((option) => (
					<MenuItem key={getOptionValue(option)}>
						<div
							onClick={onSelect.bind(null, getOptionValue(option))}
							className="cursor-pointer p-4 hover:bg-neutral-400"
						>
							{isOptionString(option) ? (
								<Text
									className={classNames(
										"!text-lg font-semibold",
										option !== current && "text-neutral-600"
									)}
								>
									{option}
								</Text>
							) : (
								option.element
							)}
						</div>
					</MenuItem>
				))}
			</MenuItems>
		</Menu>
	);
}
