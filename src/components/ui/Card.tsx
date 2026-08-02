import type { HTMLAttributes } from "react";
import { cardClass } from "./constants";

export const Card = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`${cardClass} ${className ?? ""}`} {...rest} />
);
