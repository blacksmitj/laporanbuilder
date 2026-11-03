import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { MetadataFieldDescriptor } from "@/report-types/types";

interface DynamicMetadataFieldsProps {
  fields: MetadataFieldDescriptor[];
  values: Record<string, unknown>;
  errors?: Record<string, string>;
  onChange: (name: string, value: unknown) => void;
  disabled?: boolean;
  fieldActions?: Record<string, React.ReactNode>;
}

export function DynamicMetadataFields({
  fields,
  values,
  errors,
  onChange,
  disabled,
  fieldActions,
}: DynamicMetadataFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const errorMessage = errors?.[field.name];
        const rawValue = values[field.name];
        const stringValue =
          rawValue === undefined || rawValue === null ? "" : String(rawValue);

        return (
          <Field
            key={field.name}
            data-invalid={Boolean(errorMessage)}
            className={field.colSpan === 2 ? "sm:col-span-2" : undefined}
          >
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor={`meta-${field.name}`}>
                {field.label}
                {field.required && (
                  <span className="ml-0.5 text-destructive">*</span>
                )}
              </FieldLabel>
              {fieldActions?.[field.name]}
            </div>

            {field.type === "textarea" ? (
              <Textarea
                id={`meta-${field.name}`}
                placeholder={field.placeholder}
                value={stringValue}
                disabled={disabled}
                aria-invalid={Boolean(errorMessage)}
                onChange={(e) => onChange(field.name, e.target.value)}
              />
            ) : field.type === "select" ? (
              <NativeSelect
                id={`meta-${field.name}`}
                value={stringValue}
                disabled={disabled}
                aria-invalid={Boolean(errorMessage)}
                onChange={(e) => onChange(field.name, e.target.value)}
                className="w-full"
              >
                <NativeSelectOption value="">
                  Pilih {field.label}
                </NativeSelectOption>
                {field.options?.map((opt) => (
                  <NativeSelectOption key={opt.value} value={opt.value}>
                    {opt.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            ) : (
              <Input
                id={`meta-${field.name}`}
                type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                placeholder={field.placeholder}
                value={stringValue}
                disabled={disabled}
                aria-invalid={Boolean(errorMessage)}
                onChange={(e) =>
                  onChange(
                    field.name,
                    field.type === "number"
                      ? Number(e.target.value)
                      : e.target.value,
                  )
                }
              />
            )}

            {field.description && (
              <FieldDescription>{field.description}</FieldDescription>
            )}
            {errorMessage && <FieldError>{errorMessage}</FieldError>}
          </Field>
        );
      })}
    </div>
  );
}

