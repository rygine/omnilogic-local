import { Modal } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import {
  anyDirty,
  createDirtyStore,
  ModalCloseContext,
  ModalDirtyContext,
} from "./modal-state";

import styles from "./ResponsiveModal.module.css";

// a routed modal, centered on desktop and full-screen on mobile
export const ResponsiveModal = ({
  title,
  onExited,
  size = "lg",
  closeButton = false,
  children,
}: {
  title: ReactNode;
  // called once the exit animation finishes: navigate to the parent here
  onExited: () => void;
  size?: string;
  // the top-right ✕, which closes even while an edit is unapplied
  closeButton?: boolean;
  children: ReactNode;
}) => {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [opened, setOpened] = useState(true);
  const close = () => setOpened(false);
  const [store] = useState(createDirtyStore);
  const dirty = useSyncExternalStore(
    (cb) => {
      store.listeners.add(cb);
      return () => store.listeners.delete(cb);
    },
    () => anyDirty(store),
    () => false,
  );

  // onExited fires twice, once for the overlay and once for the body
  const navigated = useRef(false);
  const handleExited = () => {
    if (navigated.current) {
      return;
    }
    navigated.current = true;
    onExited();
  };

  return (
    <ModalCloseContext.Provider value={close}>
      <ModalDirtyContext.Provider value={store}>
        <Modal
          opened={opened}
          onClose={close}
          title={title}
          centered={!isMobile}
          fullScreen={isMobile}
          size={size}
          // Esc and the backdrop dismiss only while nothing is edited
          closeOnEscape={!dirty}
          closeOnClickOutside={!dirty}
          withCloseButton={closeButton}
          classNames={{ title: styles.title }}
          transitionProps={{
            onExited: handleExited,
            transition: isMobile ? "slide-up" : "fade",
            duration: isMobile ? 250 : 150,
          }}>
          {children}
        </Modal>
      </ModalDirtyContext.Provider>
    </ModalCloseContext.Provider>
  );
};
