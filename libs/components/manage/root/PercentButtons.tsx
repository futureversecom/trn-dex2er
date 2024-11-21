import Slider from "rc-slider";
import "rc-slider/assets/index.css";

import { useManagePool } from "@/libs/context";

import { Button, Text } from "../../shared";

export function PercentButtons() {
	const { percentage, setPercentage } = useManagePool();

	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-4">
				<Text>{percentage ?? 0}%</Text>

				<div className="w-96">
					<Slider
						value={Number(percentage ?? "0")}
						onChange={(value) => setPercentage(value as number)}
						step={0.1}
						styles={{
							rail: {
								position: "absolute",
								width: "100%",
								height: "4px",
								backgroundColor: "#2e380b",
								borderRadius: "6px",
							},
							track: {
								position: "absolute",
								height: "4px",
								backgroundColor: "#d9f27e",
								borderRadius: "6px",
							},
							handle: {
								position: "absolute",
								width: "14px",
								height: "14px",
								marginTop: "-5px",
								backgroundColor: "#2e380b",
								boxShadow: "none",
								border: "solid 2px #d9f27e",
								borderRadius: "50%",
								cursor: "grab",
								opacity: "1",
								touchAction: "pan-x",
							},
						}}
					/>
				</div>
			</div>

			<div className="flex justify-center gap-2">
				{[25, 50, 75, 100].map((percent) => (
					<Button
						key={percent}
						size="sm"
						variant="secondary"
						active={percent === percentage}
						onClick={() => setPercentage(percent)}
						className="!bg-neutral-100"
					>
						{percent}%
					</Button>
				))}
			</div>
		</div>
	);
}
