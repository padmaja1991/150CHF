// ===== [COUNTRY-FORM-01 | Imports] =====
import { useState } from "react";
import { Search } from "lucide-react";
import "./Country.css";

// ===== [COUNTRY-FORM-02 | Initial Form Data] =====
const initialCountry = {
  country_name: "",
  iso2: "",
  iso3: "",
  numeric_code: "",
  region_id: "",
  currency_id: "",
  phone_code: "",
  flag_emoji: "",
  sort_order: "",
  status: "Active",
};

// ===== [COUNTRY-FORM-03 | Country Form Component] =====
export default function CountryForm({
  onBack = () => {},
  onSave,
  initialData = {},
  mode = "add",
}) {
  const [form, setForm] = useState({
    ...initialCountry,
    ...initialData,
  });

  const [error, setError] = useState("");

  const readOnly = mode === "view";

  // ===== [COUNTRY-FORM-04 | Input Change Handler] =====
  const handleChange = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // ===== [COUNTRY-FORM-05 | Validation] =====
  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (!form.country_name.trim()) {
      setError("Country Name is required.");
      return;
    }

    if (!form.numeric_code.trim()) {
      setError("Numeric Code is required.");
      return;
    }

    if (!form.currency_id) {
      setError("Please select a Currency.");
      return;
    }

    if (!form.phone_code.trim()) {
      setError("Phone Code is required.");
      return;
    }

    if (form.sort_order === "") {
      setError("Sort Order is required.");
      return;
    }

    if (typeof onSave !== "function") {
      setError("Country save API is not connected yet.");
      return;
    }

    onSave(form);
  };

  // ===== [COUNTRY-FORM-06 | Form UI] =====
  return (
    <div className="country-form-screen">

      <button
        type="button"
        className="country-back-link"
        onClick={onBack}
      >
        ← Back to Countries
      </button>

      <h2>
        {mode === "view"
          ? "View Country"
          : mode === "edit"
          ? "Edit Country"
          : "New Country"}
      </h2>

      <form className="country-form-card" onSubmit={handleSubmit}>

        <div className="country-form-grid">

          <label>
            Country Name <span className="country-required">*</span>
            <input
              type="text"
              required
              disabled={readOnly}
              value={form.country_name}
              onChange={(e) =>
                handleChange("country_name", e.target.value)
              }
            />
          </label>

          <label>
            ISO2
            <input
              type="text"
              maxLength={2}
              disabled={readOnly}
              value={form.iso2}
              onChange={(e) =>
                handleChange("iso2", e.target.value.toUpperCase())
              }
            />
          </label>

          <label>
            ISO3
            <input
              type="text"
              maxLength={3}
              disabled={readOnly}
              value={form.iso3}
              onChange={(e) =>
                handleChange("iso3", e.target.value.toUpperCase())
              }
            />
          </label>

          <label>
            Numeric Code <span className="country-required">*</span>
            <input
              type="text"
              inputMode="numeric"
              required
              disabled={readOnly}
              value={form.numeric_code}
              onChange={(e) =>
                handleChange("numeric_code", e.target.value)
              }
            />
          </label>

          {/* ===== [COUNTRY-LOOKUP-01 | Region] ===== */}
          <label>
            Region
            <div className="country-lookup-field">
              <input
                type="text"
                readOnly
                placeholder="Type 3+ characters to search Region..."
                value={form.region_name || ""}
              />
              <button
                type="button"
                disabled={readOnly}
                title="Search Region"
                onClick={() =>
                  setError("Region lookup is not connected yet.")
                }
              >
                <Search size={15} />
              </button>
            </div>
          </label>

          {/* ===== [COUNTRY-LOOKUP-02 | Currency] ===== */}
          <label>
            Currency <span className="country-required">*</span>
            <div className="country-lookup-field">
              <input
                type="text"
                readOnly
                placeholder="Type 3+ characters to search Currency..."
                value={form.currency_name || ""}
              />
              <button
                type="button"
                disabled={readOnly}
                title="Search Currency"
                onClick={() =>
                  setError("Currency lookup is not connected yet.")
                }
              >
                <Search size={15} />
              </button>
            </div>
          </label>

          <label>
            Phone Code <span className="country-required">*</span>
            <input
              type="text"
              required
              disabled={readOnly}
              value={form.phone_code}
              onChange={(e) =>
                handleChange("phone_code", e.target.value)
              }
            />
          </label>

          <label>
            Flag Emoji
            <input
              type="text"
              disabled={readOnly}
              value={form.flag_emoji}
              onChange={(e) =>
                handleChange("flag_emoji", e.target.value)
              }
            />
          </label>

          <label>
            Sort Order <span className="country-required">*</span>
            <input
              type="number"
              min="0"
              required
              disabled={readOnly}
              value={form.sort_order}
              onChange={(e) =>
                handleChange("sort_order", e.target.value)
              }
            />
          </label>

          <label>
            Status <span className="country-required">*</span>
            <select
              required
              disabled={readOnly}
              value={form.status}
              onChange={(e) =>
                handleChange("status", e.target.value)
              }
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>

        </div>

        {error && (
          <p className="country-form-error" role="alert">
            {error}
          </p>
        )}

        <div className="country-form-actions">
          {!readOnly && (
            <button type="submit" className="country-create-btn">
              {mode === "edit"
                ? "Update Country"
                : "Create Country"}
            </button>
          )}

          <button
            type="button"
            className="country-cancel-btn"
            onClick={onBack}
          >
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
}