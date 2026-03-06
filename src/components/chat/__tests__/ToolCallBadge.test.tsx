import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: ToolInvocation["state"] = "result"
): ToolInvocation {
  return { toolCallId: "test-id", toolName, args, state, result: "ok" } as ToolInvocation;
}

test("str_replace_editor create shows Creating label", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" })} />);
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
});

test("str_replace_editor str_replace shows Editing label", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "str_replace", path: "/components/Card.jsx" })} />);
  expect(screen.getByText("Editing /components/Card.jsx")).toBeDefined();
});

test("str_replace_editor insert shows Editing label", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "insert", path: "/App.jsx" })} />);
  expect(screen.getByText("Editing /App.jsx")).toBeDefined();
});

test("str_replace_editor view shows Viewing label", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "view", path: "/App.jsx" })} />);
  expect(screen.getByText("Viewing /App.jsx")).toBeDefined();
});

test("file_manager rename shows Renaming label", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("file_manager", { command: "rename", path: "/old.jsx" })} />);
  expect(screen.getByText("Renaming /old.jsx")).toBeDefined();
});

test("file_manager delete shows Deleting label", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("file_manager", { command: "delete", path: "/App.jsx" })} />);
  expect(screen.getByText("Deleting /App.jsx")).toBeDefined();
});

test("unknown tool shows raw tool name", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("unknown_tool", {})} />);
  expect(screen.getByText("unknown_tool")).toBeDefined();
});

test("state call shows spinner", () => {
  const inv = { toolCallId: "x", toolName: "str_replace_editor", args: { command: "create", path: "/App.jsx" }, state: "call" } as ToolInvocation;
  const { container } = render(<ToolCallBadge toolInvocation={inv} />);
  expect(container.querySelector(".animate-spin")).not.toBeNull();
});

test("state partial-call shows spinner", () => {
  const inv = { toolCallId: "x", toolName: "str_replace_editor", args: { command: "create", path: "/App.jsx" }, state: "partial-call" } as ToolInvocation;
  const { container } = render(<ToolCallBadge toolInvocation={inv} />);
  expect(container.querySelector(".animate-spin")).not.toBeNull();
});

test("state result shows green dot and no spinner", () => {
  const { container } = render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "result")} />);
  expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("args.path undefined renders without crashing", () => {
  const inv = { toolCallId: "x", toolName: "str_replace_editor", args: { command: "create" }, state: "partial-call" } as ToolInvocation;
  const { container } = render(<ToolCallBadge toolInvocation={inv} />);
  expect(container.querySelector(".animate-spin")).not.toBeNull();
  expect(screen.getByText(/^Creating/)).toBeDefined();
});
