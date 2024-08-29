import { Loader, Text } from "@/libs/components/shared";

export default function Loading() {
	return (
		<div className="relative flex items-center">
			<Text variant="heading" className="!text-7xl !text-primary-700">
				De
			</Text>
			<div className="w-20" />
			<Loader className="absolute bottom-3 left-28 !h-16 !w-16" />
			<Text variant="heading" className="!text-7xl !text-primary-700">
				ter
			</Text>
		</div>
	);
}
